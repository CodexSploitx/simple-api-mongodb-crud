# Change Email Address: Verificación doble con OTP

Guía para que los desarrolladores integren el cambio de email de cuenta, restringido a usuarios autenticados y con verificación de email actual y nuevo email mediante OTP.

## Requisitos
- Usuario autenticado (Bearer `accessToken`).
- Toggle del evento `change_email` ACTIVO.
  - Si está desactivado: `400 { "error": "Change email deactivated: event not active" }`
- Plantilla activa para `change_email` (se autogenera `__default__` si falta).

## Flujo
1) Iniciar proceso con email actual y contraseña
   - `POST /api/auth-client/change-email/start`
   - Body:
   ```json
   { "currentEmail": "user@example.com", "password": "StrongP@ss1" }
   ```
   - Efecto: genera OTP para el email actual (`eventKey: "change_email_current"`) y crea una solicitud en `changeemail`.
   - Código: `app/api/auth-client/change-email/start/route.ts:1-116`.

2) Verificar OTP enviado al email actual
   - `POST /api/auth-client/change-email/verify-current`
   - Body:
   ```json
   { "code": "123456" }
   ```
   - Efecto: valida OTP (`attempts`/`maxAttempts`, expiración) y marca la solicitud como `current_verified`.
   - Código: `app/api/auth-client/change-email/verify-current/route.ts:1-51`.

3) Solicitar OTP para el nuevo email
   - `POST /api/auth-client/change-email/request-new`
   - Body:
   ```json
   { "newEmail": "newuser@example.com" }
   ```
   - Requisitos: `current_verified` y que el `newEmail` no esté en uso.
   - Efecto: genera OTP para el nuevo email (`eventKey: "change_email_new"`), envía correo y marca la solicitud `new_requested`.
   - Código: `app/api/auth-client/change-email/request-new/route.ts:1-106`.

4) Confirmar OTP del nuevo email y actualizar en DB
   - `POST /api/auth-client/change-email/confirm-new`
   - Body:
   ```json
   { "code": "654321" }
   ```
   - Efecto: valida OTP, actualiza `email` en `AUTH_CLIENT_DB.users`, pone `verifiEmail: true`, incrementa `tokenVersion`, emite `accessToken` y setea `refreshToken` cookie.
   - Código: `app/api/auth-client/change-email/confirm-new/route.ts:1-85`.

## Placeholders en plantillas
- `{{ .EmailUSer }}`, `{{ .UserName }}`, `{{ .CodeConfirmation }}`, `{{ .SiteURL }}`, `{{ ._id }}`.
- UI solo muestra `{{ .CodeConfirmation }}` cuando `eventKey === "change_email"`.
- Código: `app/auth-client/components/Templates/TemplatesModal.tsx:122-141`.

## Errores comunes
- `400 Invalid currentEmail` / `401 Invalid password` en inicio.
- `400 Current email mismatch` si el email no coincide con el del usuario autenticado.
- `404 Code not found` / `410 Code expired` / `429 Too many attempts` durante verificaciones OTP.
- `409 Email already in use` al solicitar nuevo email.
- `400 Current email not verified` si se intenta pedir nuevo email sin el paso anterior.
- `400 New email not requested` si se intenta confirmar sin haberlo solicitado.

## Recomendaciones
- Mantén una sola plantilla activa por evento.
- Define `otpMaxAttempts`, `otpCooldownSeconds` y `otpMaxPerHour` en `stmp/settings` según tu necesidad.
- Aplica CORS y TLS en producción.

