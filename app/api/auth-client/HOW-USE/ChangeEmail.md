# Change Email Address: Double OTP verification

Guide to integrate email change for an account, restricted to authenticated users and requiring verification of the current email and the new email via OTP.

## Requirements
- Authenticated user (Bearer `accessToken`).
- `change_email` event toggle ACTIVE.
  - If disabled: `400 { "error": "Change email deactivated: event not active" }`
- Active template for `change_email` (auto-generates `__default__` if missing).

## Flow
1) Start with current email and password
   - `POST /api/auth-client/change-email/start`
   - Body:
   ```json
   { "currentEmail": "user@example.com", "password": "StrongP@ss1" }
   ```
   - Effect: generates OTP for the current email (`eventKey: "change_email_current"`) and creates a request in `changeemail`.
   - Code: `app/api/auth-client/change-email/start/route.ts:1-116`.

2) Verify OTP sent to the current email
   - `POST /api/auth-client/change-email/verify-current`
   - Body:
   ```json
   { "code": "123456" }
   ```
   - Effect: validates OTP (`attempts`/`maxAttempts`, expiration) and marks the request as `current_verified`.
   - Code: `app/api/auth-client/change-email/verify-current/route.ts:1-51`.

3) Request OTP for the new email
   - `POST /api/auth-client/change-email/request-new`
   - Body:
   ```json
   { "newEmail": "newuser@example.com" }
   ```
   - Requirements: `current_verified` and that `newEmail` is not in use.
   - Effect: generates OTP for the new email (`eventKey: "change_email_new"`), sends email and marks the request `new_requested`.
   - Code: `app/api/auth-client/change-email/request-new/route.ts:1-106`.

4) Confirm OTP for the new email and update DB
   - `POST /api/auth-client/change-email/confirm-new`
   - Body:
   ```json
   { "code": "654321" }
   ```
   - Effect: validates OTP, updates `email` in `AUTH_CLIENT_DB.users`, sets `verifiEmail: true`, increments `tokenVersion`, issues `accessToken` and sets `refreshToken` cookie.
   - Code: `app/api/auth-client/change-email/confirm-new/route.ts:1-85`.

## Template placeholders
- `{{ .EmailUSer }}`, `{{ .UserName }}`, `{{ .CodeConfirmation }}`, `{{ .SiteURL }}`, `{{ ._id }}`.
- UI shows `{{ .CodeConfirmation }}` only when `eventKey === "change_email"`.
- Code: `app/auth-client/components/Templates/TemplatesModal.tsx:122-141`.

## Common errors
- `400 Invalid currentEmail` / `401 Invalid password` on start.
- `400 Current email mismatch` if the email does not match the authenticated user's email.
- `404 Code not found` / `410 Code expired` / `429 Too many attempts` during OTP verification.
- `409 Email already in use` when requesting the new email.
- `400 Current email not verified` when requesting `newEmail` without the previous step.
- `400 New email not requested` when trying to confirm without requesting it.

## Recommendations
- Keep a single active template per event.
- Define `otpMaxAttempts`, `otpCooldownSeconds` and `otpMaxPerHour` in `stmp/settings` as needed.
- Enforce CORS and TLS in production.
