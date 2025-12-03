# Auth-Client: definición y límites

## Qué es
- Microservicio de autenticación independiente para aplicaciones cliente.
- Gestiona usuarios en `AUTH_CLIENT_DB` y `AUTH_CLIENT_COLLECTION`.
- Emite `accessToken` (JWT) y mantiene `refreshToken` en cookie HTTP-only.
- Modelo de usuario mínimo:
  - `_id`, `email`, `username`, `password` (hash), `tokenVersion`, `createdAt`, `updatedAt`, `verifiEmail`.

## Qué NO es
- No es el login de la app principal MongoDB CRUD.
- No usa ni mezcla colecciones/DB de la app principal (`AUTH_DB_USERS`, `AUTH_DB_COLLECTION`).
- No maneja permisos CRUD ni campos como `permissions.*` ni `authClientAccess`.
- No añade ni usa `{{ .permissions.* }}` ni `{{ .Token }}` en plantillas.

## Entorno (solo Auth-Client)
- `AUTH_CLIENT_DB=authclient`
- `AUTH_CLIENT_COLLECTION=users`
- `AUTH_CLIENT_DELETE_USERS=deleteusers`
- `JWT_AUTH_CLIENT` y `JWT_AUTH_CLIENT_EXPIRATION`
- `CORS_AUTH_CLIENT`, `RELACIONALDB_AUTH_CLIENT`

## Endpoints principales
- `POST /api/auth-client/register` crea usuario y responde `accessToken`.
- `POST /api/auth-client/login` valida credenciales y responde `accessToken`.
- `POST /api/auth-client/refresh` renueva `accessToken` usando `refreshToken`.

## Verificación de email (OTP)
- Configuración central en DB vía `GET/POST /api/stmp/settings`.
- Flag `requireEmailVerificationLogin` obliga que `verifiEmail === true` para iniciar sesión.
- Flujo OTP:
  - Envío de email con plantilla activa del evento `confirm_sign_up` (`/api/stmp/send` o automático tras registro si está activo el evento).
  - Verificación `POST /api/stmp/otp/verify` marca `verifiEmail: true`.
  - Login rechaza con 403 `Email no verificado` si el flag está activo y el usuario no verificó.

## Plantillas SMTP (placeholders soportados)
- `{{ .EmailUSer }}` email del usuario
- `{{ .UserName }}` nombre del usuario
- `{{ .CodeConfirmation }}` código OTP
- `{{ .SiteURL }}` URL del sitio
- `{{ ._id }}` id del usuario
- No usar `{{ .permissions.* }}` ni `{{ .Token }}`.

## Separación estricta
- Importar y consultar únicamente `AUTH_CLIENT_DB/ AUTH_CLIENT_COLLECTION` para usuarios.
- No leer ni escribir en colecciones de la app principal.
- Mantener la lógica de permisos fuera de Auth-Client.
- Las plantillas y configuración SMTP viven en la colección/configuración de SMTP del microservicio.

## Checklist rápido
- [ ] ¿Usas `AUTH_CLIENT_DB` y `AUTH_CLIENT_COLLECTION`?
- [ ] ¿El login aplica `requireEmailVerificationLogin` desde DB?
- [ ] ¿No hay referencias a `permissions.*` ni colecciones de la app principal?
- [ ] ¿Las plantillas usan solo los placeholders soportados?
