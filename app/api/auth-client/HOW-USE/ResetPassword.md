# Reset Password (Auth-Client)

Allows users to reset their password using an OTP sent via email.
Supports two modes:
- Unauthenticated (forgot password)
- Authenticated (logged-in user)

## Requirements
- User exists in `AUTH_CLIENT_DB`.`AUTH_CLIENT_COLLECTION`.
- `reset_password` event active in SMTP (required toggle).
- Active template for `reset_password` (default is auto-generated if missing).

## Toggle and templates
- Activation: `POST /api/stmp/events` with `{ "eventKey": "reset_password", "active": true }`.
- When activating, if no active template exists, a default with OTP is created.
- Default implementation: `app/api/stmp/events/route.ts:132-141`.

### Supported placeholders
- `{{ .EmailUSer }}`: user's email
- `{{ .UserName }}`: display name
- `{{ .CodeConfirmation }}`: 6-digit OTP code
- `{{ .SiteURL }}`: site/API base URL
- `{{ ._id }}`: user ID
- `{{ .Token }}`: not recommended; if present, it maps to the same OTP
  - Unauthenticated replacement: `app/api/auth-client/reset-password/request/route.ts:65-73`
  - Authenticated replacement: `app/api/auth-client/reset-password/request-auth/route.ts:67-75`

## Flow: Unauthenticated (forgot password)
1) Request OTP
- `POST /api/auth-client/reset-password/request`
- Body: `{ "email": "user@example.com" }`
- Returns `200 { success: true }` (avoids enumeration).
- Implementation: OTP generation and email send
  - OTP insert: `app/api/auth-client/reset-password/request/route.ts:45-53`
  - Outbox and send: `app/api/auth-client/reset-password/request/route.ts:82-90`

2) Confirm OTP and set new password
- `POST /api/auth-client/reset-password/confirm`
- Body: `{ "email": "user@example.com", "code": "123456", "newPassword": "NewPass123!" }`
- Validates OTP, marks it as used, updates password hash and revokes tokens (`tokenVersion +1`).
- Implementation: `app/api/auth-client/reset-password/confirm/route.ts:32-55`

## Flow: Authenticated
1) Request OTP (sends to the authenticated user's email)
- `POST /api/auth-client/reset-password/request-auth` with Auth-Client Bearer `accessToken`
- Body: none
- Implementation
  - OTP insert: `app/api/auth-client/reset-password/request-auth/route.ts:43-51`
  - Outbox and send: `app/api/auth-client/reset-password/request-auth/route.ts:86-94`

2) Confirm OTP and change password
- `POST /api/auth-client/reset-password/confirm-auth` with Bearer `accessToken`
- Body: `{ "code": "123456", "newPassword": "NewPass123!" }`
- Validates OTP, updates password, revokes tokens; issues new tokens.
- Implementation: `app/api/auth-client/reset-password/confirm-auth/route.ts:28-73`

## OTP settings
- TTL: `otpTtlSeconds` (default 600s)
- Max attempts: `otpMaxAttempts` (default 5)
- Read from `stmpdb.config` in request/confirm endpoints.

## Responses and common errors
- `400 { error: "Invalid email" | "Invalid code" | "Weak password" }`
- `400 { error: "Reset password deactivated: event not active" }` if event is disabled.
- `404 { error: "User not found" | "Code not found" }`
- `410 { error: "Code expired" }`
- `429 { error: "Too many attempts" }`

## Examples
- Request OTP (unauthenticated):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/request" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com" }'
```
- Confirm OTP (unauthenticated):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/confirm" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com", "code": "123456", "newPassword": "NewPass123!" }'
```
- Request OTP (authenticated):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/request-auth" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
- Confirm OTP (authenticated):
```bash
curl -X POST "http://localhost:3000/api/auth-client/reset-password/confirm-auth" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "123456", "newPassword": "NewPass123!" }'
```

## Best practices
- Keep a single active template per event.
- Avoid using `{{ .Token }}`; if used, it maps to the OTP.
- Do not include sensitive data in HTML.
- Use strong passwords (min 8 chars, mix of types).
