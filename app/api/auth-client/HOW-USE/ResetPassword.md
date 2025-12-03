# Reset Password (Auth‑Client)

Permite a los usuarios restablecer su contraseña mediante un código OTP enviado por correo.
Soporta dos modos:
- No autenticado (forgot password)
- Autenticado (usuario logueado)

## Requisitos
- Usuario existente en `AUTH_CLIENT_DB`.`AUTH_CLIENT_COLLECTION`.
- Evento `reset_password` activo en SMTP (toggle obligatorio).
- Plantilla activa para `reset_password` (se autogenera default si no existe).

## Toggle y plantillas
- Activación: `POST /api/stmp/events` con `{ "eventKey": "reset_password", "active": true }`.
- Al activar, si no hay plantilla activa, se crea una por defecto con OTP.
- Implementación default: `app/api/stmp/events/route.ts:132-141`.

### Placeholders soportados
- `{{ .EmailUSer }}`: email del usuario
- `{{ .UserName }}`: nombre a mostrar
- `{{ .CodeConfirmation }}`: código OTP de 6 dígitos
- `{{ .SiteURL }}`: URL base del sitio/API
- `{{ ._id }}`: id del usuario
- `{{ .Token }}`: no recomendado; si aparece, se reemplaza por el mismo OTP
  - Reemplazo en no autenticado: `app/api/auth-client/reset-password/request/route.ts:65-73`
  - Reemplazo en autenticado: `app/api/auth-client/reset-password/request-auth/route.ts:67-75`

## Flujo: No autenticado (forgot password)
1) Solicitar OTP
- `POST /api/auth-client/reset-password/request`
- Body: `{ "email": "user@example.com" }`
- Responde `200 { success: true }` (evita enumeración).
- Implementación: generación OTP y envío email
  - OTP insert: `app/api/auth-client/reset-password/request/route.ts:45-53`
  - Envío y outbox: `app/api/auth-client/reset-password/request/route.ts:82-90`

2) Confirmar OTP y establecer nueva contraseña
- `POST /api/auth-client/reset-password/confirm`
- Body: `{ "email": "user@example.com", "code": "123456", "newPassword": "NuevaPass123!" }`
- Valida código vigente, marca OTP usado, actualiza `password` hash y revoca tokens (`tokenVersion +1`).
- Implementación: `app/api/auth-client/reset-password/confirm/route.ts:32-55`

## Flujo: Autenticado
1) Solicitar OTP (envía al email del usuario autenticado)
- `POST /api/auth-client/reset-password/request-auth` con Bearer `accessToken` del Auth‑Client
- Body: vacío
- Implementación
  - OTP insert: `app/api/auth-client/reset-password/request-auth/route.ts:43-51`
  - Envío y outbox: `app/api/auth-client/reset-password/request-auth/route.ts:86-94`

2) Confirmar OTP y cambiar contraseña
- `POST /api/auth-client/reset-password/confirm-auth` con Bearer `accessToken`
- Body: `{ "code": "123456", "newPassword": "NuevaPass123!" }`
- Valida OTP, actualiza `password` y revoca tokens; emite nuevos tokens.
- Implementación: `app/api/auth-client/reset-password/confirm-auth/route.ts:28-73`

## Configuración de OTP
- TTL: `otpTtlSeconds` (por defecto 600 s)
- Intentos máximos: `otpMaxAttempts` (por defecto 5)
- Leído desde `stmpdb.config` en los endpoints de request/confirm.

## Respuestas y errores comunes
- `400 { error: "Invalid email" | "Invalid code" | "Weak password" }`
- `400 { error: "Reset password deactivated: event not active" }` si el evento está desactivado.
- `404 { error: "User not found" | "Code not found" }`
- `410 { error: "Code expired" }`
- `429 { error: "Too many attempts" }`

## Ejemplos
- Solicitar OTP (no autenticado):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/request" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com" }'
```
- Confirmar OTP (no autenticado):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/confirm" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com", "code": "123456", "newPassword": "NuevaPass123!" }'
```
- Solicitar OTP (autenticado):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/request-auth" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
- Confirmar OTP (autenticado):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/confirm-auth" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "123456", "newPassword": "NuevaPass123!" }'
```

## Buenas prácticas
- Mantén una sola plantilla activa por evento.
- Evita usar `{{ .Token }}`; si lo haces, será mapeado al OTP.
- No incluir datos sensibles en el HTML.
- Usa contraseñas robustas (mínimo 8 caracteres, mezcla de tipos).
