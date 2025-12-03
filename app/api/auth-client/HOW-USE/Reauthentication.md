# Reauthentication (Auth‑Client)

Solicita reautenticación del usuario antes de acciones sensibles. Se basa en OTP por email y emite un `reauthToken` corto que se envía en el header `x-reauth-token` al ejecutar la acción.

## Requisitos
- Usuario en `AUTH_CLIENT_DB`.`AUTH_CLIENT_COLLECTION`.
- Evento `reauthentication` activo en STMP.
- Plantilla activa para `reauthentication` (se autogenera si no existe).
- Toggles por acción en `STMP settings` para exigir reauth.

## Toggle y plantillas
- Activación del evento: `POST /api/stmp/events` con `{ "eventKey": "reauthentication", "active": true }`.
- Plantilla por defecto se crea si no existe: `app/api/stmp/events/route.ts:143-151`.

### Placeholders soportados
- `{{ .EmailUSer }}`: email
- `{{ .UserName }}`: nombre a mostrar
- `{{ .CodeConfirmation }}`: código OTP de 6 dígitos
- `{{ .SiteURL }}`: URL base
- `{{ ._id }}`: id del usuario

## Flujo de reautenticación
1) Solicitar OTP
- Endpoint: `POST /api/auth-client/reauth/request` con Bearer `accessToken` (Auth‑Client)
- Envía email con OTP y registra outbox
- Referencias:
  - Inserción OTP: `app/api/auth-client/reauth/request/route.ts:42-50`
  - Envío y outbox: `app/api/auth-client/reauth/request/route.ts:85-92`

2) Confirmar OTP y obtener `reauthToken`
- Endpoint: `POST /api/auth-client/reauth/confirm` con Bearer `accessToken`
- Body: `{ "code": "123456", "action": "<opcional>" }`
- Devuelve `{ reauthToken, expiresInSeconds }` (default 300s)
- Referencias:
  - Validación OTP: `app/api/auth-client/reauth/confirm/route.ts:31-46`
  - Generación token: `app/api/auth-client/reauth/confirm/route.ts:52-54`, `lib/auth.ts:45-55`

3) Ejecutar acción sensible con `x-reauth-token`
- Enviar el header `x-reauth-token: <reauthToken>` junto al `Authorization: Bearer <accessToken>`
- La acción valida que el token pertenezca al usuario y, si `action` viene en el token, que coincida con la acción requerida.

## Acciones sensibles soportadas
- Cambiar contraseña: `POST /api/auth-client/change-password`
  - Gating: `app/api/auth-client/change-password/route.ts:58-67`
  - Body: `{ "currentPassword": "***", "newPassword": "***" }`
- Cambiar email (inicio): `POST /api/auth-client/change-email/start`
  - Gating: `app/api/auth-client/change-email/start/route.ts:54-62`
  - Body: `{ "currentEmail": "user@example.com", "password": "***" }`
  - Luego confirma con OTP enviado (flujo propio de change-email)
- Eliminar cuenta: `POST /api/auth-client/delete-account`
  - Gating: `app/api/auth-client/delete-account/route.ts:21-29`
- Acción crítica (definida): `POST /api/auth-client/critical-action`
  - Gating: `app/api/auth-client/critical-action/route.ts:27-35`
  - Body: `{ "type": "suspend_account", "reason": "<opcional>" }`
  - Implementación de suspensión: `app/api/auth-client/critical-action/route.ts:40-49`

## Toggles de reautenticación (por acción)
- Endpoint: `GET/POST /api/stmp/settings`
- Campos:
  - `requireReauthChangePassword`
  - `requireReauthChangeEmail`
  - `requireReauthDeleteAccount`
  - `requireReauthCriticalAction`
- Lectura/actualización: `app/api/stmp/settings/route.ts:34-38,47-81`

## Errores comunes
- `401 { error: "Reauthentication required" }` si falta o no coincide `x-reauth-token`.
- `404 { error: "User not found" | "Code not found" }`.
- `410 { error: "Code expired" }`.
- `429 { error: "Too many attempts" }` al exceder intentos OTP.

## Ejemplos
- Solicitar OTP:
```bash
curl -X POST "http://localhost:3000/api/auth-client/reauth/request" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
- Confirmar OTP y obtener token:
```bash
curl -X POST "http://localhost:3000/api/auth-client/reauth/confirm" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "123456", "action": "change_password" }'
```
- Usar en cambiar contraseña:
```bash
curl -X POST "http://localhost:3000/api/auth-client/change-password" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "x-reauth-token: <REAUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "currentPassword": "Old123!", "newPassword": "New456!" }'
```
- Usar en eliminar cuenta:
```bash
curl -X POST "http://localhost:3000/api/auth-client/delete-account" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "x-reauth-token: <REAUTH_TOKEN>"
```
- Acción crítica (suspender cuenta):
```bash
curl -X POST "http://localhost:3000/api/auth-client/critical-action" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "x-reauth-token: <REAUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "type": "suspend_account", "reason": "policy breach" }'
```

## Buenas prácticas
- Ajusta `otpTtlSeconds` e `otpMaxAttempts` según tu seguridad.
- Si defines `action` en `reauth/confirm`, usa ese mismo verbo en el gating de la ruta (`"change_password"`, `"change_email"`, `"delete_account"`, `"critical_action"`).
- Envía siempre `x-reauth-token` cuando el toggle de la acción esté activo.
