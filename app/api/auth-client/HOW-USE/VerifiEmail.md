# Verificación de Email por OTP (Auth-Client)

## Objetivo
- Obligar (opcional) que el usuario verifique su email con un código OTP antes de poder iniciar sesión.
- Todo se configura y se gestiona desde el microservicio Auth‑Client y su módulo SMTP.

## Configuración
- Toggle UI: en `SMTP → Configuration` habilita `Require email verification to login`.
- API: `GET/POST /api/stmp/settings`
  - Campo `requireEmailVerificationLogin: boolean`.
  - Si está en `true`, el login devuelve `403` cuando `verifiEmail !== true`.

## Eventos y plantillas
- Evento: `confirm_sign_up`.
- Endpoint: `GET/POST /api/stmp/events` para activar/desactivar eventos.
- Endpoint: `GET/POST /api/stmp/templates` para gestionar plantillas.
- Placeholders soportados en plantillas:
  - `{{ .EmailUSer }}`
  - `{{ .UserName }}`
  - `{{ .CodeConfirmation }}`
  - `{{ .SiteURL }}`
  - `{{ ._id }}`

## Flujo estándar
1) Registro de usuario
- `POST /api/auth-client/register`
- Si `confirm_sign_up` está activo, se encola/envía un email usando la plantilla activa.
- Si la plantilla contiene `{{ .CodeConfirmation }}`, se genera OTP y se adjunta en el email.

2) Verificar OTP
- `POST /api/stmp/otp/verify`
- Body: `{ "userId": "<id>", "code": "<otp>" }`
- Valida el código (no usado y dentro de vigencia) y marca el usuario como `verifiEmail: true`.

3) Iniciar sesión
- `POST /api/auth-client/login`
- Si `requireEmailVerificationLogin === true` y el usuario no verificó, responde `403` con `{ "error": "Email no verificado" }`.
- Si el toggle está `false`, permite login sin verificación.

## Endpoints de soporte
- Crear OTP (sin enviar email): `POST /api/stmp/otp/create`
  - Body: `{ "userId": "<id>", "eventKey": "confirm_sign_up", "ttlSeconds": 600 }`
  - Responde `{ success, code, expiresAt }`.
- Enviar email de evento: `POST /api/stmp/send`
  - Body: `{ "eventKey": "confirm_sign_up", "userId": "<id>" }`
  - Si la plantilla incluye `{{ .CodeConfirmation }}`, se genera OTP y se añade al cuerpo.

### Endpoint público: Request OTP

- **POST** `/api/auth-client/login/request-otp`
- **Body**: `{ "identifier": "email OR username" }`
- **Retorno**: Siempre `200 { success: true }` para evitar revelar si el usuario existe (no enumeration).
- **Comportamiento**:
  - Busca al usuario por `email` o `username` en `AUTH_CLIENT_DB/users`.
  - Verifica que el evento `confirm_sign_up` esté activo y haya plantilla activa.
  - Si la plantilla contiene `{{ .CodeConfirmation }}`:
    - Genera un OTP con TTL 10 min y guarda `{ attempts: 0, maxAttempts: 5 }`.
    - Throttling: no reemite si existe uno activo creado en el último minuto.
    - Rate cap por usuario: máximo 5 OTP por hora.
  - Encola y envía el email con el OTP si SMTP está configurado.
- **Implementación**: `app/api/auth-client/login/request-otp/route.ts`.

#### Ejemplo
```
POST /api/auth-client/login/request-otp
{ "identifier": "user@example.com" }

// 200 OK
{ "success": true }
```

## Ejemplos
- Registro:
```
POST /api/auth-client/register
{ "email": "user@example.com", "username": "User", "password": "StrongP@ss1" }
```
- Verificar OTP:
```
POST /api/stmp/otp/verify
{ "userId": "69289ee8692159244ed49b52", "code": "123456" }
```
- Login:
```
POST /api/auth-client/login
{ "identifier": "user@example.com", "password": "StrongP@ss1" }
```

## Comportamiento del login
- Implementado en `app/api/auth-client/login/route.ts`.
- Lee configuración desde `stmpdb.config` y aplica la regla de verificación.

## Persistencia y expiración
- OTP se almacena en `{ db: STMP_DB || AUTH_CLIENT_DB, collection: STMP_OTP || "otp" }`.
- Expira típicamente a los 10 minutos; configurable con `ttlSeconds` en `otp/create`.

### Limitador de intentos (verification)
- Cada OTP guarda `attempts` y `maxAttempts`.
- Si el código ingresado es incorrecto:
  - Incrementa `attempts`.
  - Al alcanzar `maxAttempts` (por defecto 5), desactiva el OTP y responde `429 { error: "Too many attempts" }`.
- Implementación: `app/api/stmp/otp/verify/route.ts`.

#### Ejemplos
```
// Código incorrecto
400 { "success": false, "error": "Invalid code" }

// Demasiados intentos
429 { "success": false, "error": "Too many attempts" }
```

## Errores típicos
- `400 Invalid or expired code`: OTP incorrecto o expirado.
- `403 Email not verified`: intento de login sin verificación cuando el toggle está activo.
- `404 No active template for event`: al enviar email sin plantilla activa para el evento.

## Referencias de código
- Request OTP: `app/api/auth-client/login/request-otp/route.ts:26-30`, `50-60`, `66-92`.
- Generación de OTP en registro: `app/api/auth-client/register/route.ts:101-107`.
- Generación de OTP en envío: `app/api/stmp/send/route.ts:71-78`.
- Verificación con límite de intentos: `app/api/stmp/otp/verify/route.ts:18-31`.

## Recomendaciones de integración
- Mostrar en tu UI un paso “Verifica tu email” tras registrarse si el toggle está activo.
- Añadir un botón “Enviar código” que llame a `POST /api/stmp/send` con `eventKey: "confirm_sign_up"`.
- En la pantalla de verificación, manejar reintentos y mostrar tiempo restante si deseas.
- Tras verificar OTP con éxito, redirigir al login o refrescar el estado del usuario.
