# Email Verification via OTP (Auth-Client)

## Goal
- Optionally require users to verify their email with an OTP before login.
- Fully managed by the Auth-Client microservice and its SMTP module.

## Configuration
- Toggle in UI: `Notifications → SMTP` enable `Require email verification to login`.
- API: `GET/POST /api/stmp/settings`
  - Field `requireEmailVerificationLogin: boolean`.
  - When `true`, login returns `403` if `verifiEmail !== true`.

## Events and templates
- Event: `confirm_sign_up`.
- Manage events: `GET/POST /api/stmp/events`.
- Manage templates: `GET/POST /api/stmp/templates`.
- Supported placeholders in templates:
  - `{{ .EmailUSer }}`
  - `{{ .UserName }}`
  - `{{ .CodeConfirmation }}`
  - `{{ .SiteURL }}`
  - `{{ ._id }}`

## Standard flow
1) User registration
- `POST /api/auth-client/register`
- If `confirm_sign_up` is active, an email is queued/sent with the active template.
- If the template includes `{{ .CodeConfirmation }}`, an OTP is generated and included in the email.

2) Verify OTP
- `POST /api/stmp/otp/verify`
- Body: `{ "userId": "<id>", "code": "<otp>" }`
- Validates the OTP (unused and not expired) and sets `verifiEmail: true`.

3) Login
- `POST /api/auth-client/login`
- If `requireEmailVerificationLogin === true` and the user has not verified, returns `403 { "error": "Email not verified" }`.
- If the toggle is `false`, login is allowed without verification.

## Support endpoints
- Create OTP (without sending email): `POST /api/stmp/otp/create`
  - Body: `{ "userId": "<id>", "eventKey": "confirm_sign_up", "ttlSeconds": 600 }`
  - Returns `{ success, code, expiresAt }`.
- Send event email: `POST /api/stmp/send`
  - Body: `{ "eventKey": "confirm_sign_up", "userId": "<id>" }`
  - If the template includes `{{ .CodeConfirmation }}`, an OTP is generated and added to the body.

### Public endpoint: Request OTP
- `POST /api/auth-client/login/request-otp`
- Body: `{ "identifier": "email OR username" }`
- Return: always `200 { success: true }` to avoid user enumeration.
- Behavior: see `app/api/auth-client/login/request-otp/route.ts` for throttling and per-user caps.

## Examples
- Register:
```
POST /api/auth-client/register
{ "email": "user@example.com", "username": "User", "password": "StrongP@ss1" }
```
- Verify OTP:
```
POST /api/stmp/otp/verify
{ "userId": "69289ee8692159244ed49b52", "code": "123456" }
```
- Login:
```
POST /api/auth-client/login
{ "identifier": "user@example.com", "password": "StrongP@ss1" }
```

## Login behavior
- Implemented in `app/api/auth-client/login/route.ts`.
- Reads configuration from `stmpdb.config` and enforces the verification rule.

## Persistence and expiry
- OTP is stored in `{ db: STMP_DB || AUTH_CLIENT_DB, collection: STMP_OTP || "otp" }`.
- Expires typically after 10 minutes; configurable via `ttlSeconds` in `otp/create`.

### Attempt limiter (verification)
- Each OTP holds `attempts` and `maxAttempts`.
- If the code is wrong:
  - Increments `attempts`.
  - At `maxAttempts` (default 5), deactivates the OTP and returns `429 { error: "Too many attempts" }`.
- Implementation: `app/api/stmp/otp/verify/route.ts`.

## Common errors
- `400 Invalid or expired code`
- `403 Email not verified` (login while toggle is active)
- `404 No active template for event` when sending email without an active template

## Code references
- Request OTP: `app/api/auth-client/login/request-otp/route.ts:26-30`, `50-60`, `66-92`.
- OTP generation in registration: `app/api/auth-client/register/route.ts:101-107`.
- OTP generation in send: `app/api/stmp/send/route.ts:71-78`.
- Verification with attempt limits: `app/api/stmp/otp/verify/route.ts:18-31`.

## Integration tips
- Show a "Verify your email" step in your UI after registration if the toggle is active.
- Add a "Send code" button that calls `POST /api/stmp/send` with `eventKey: "confirm_sign_up"`.
- In the verification screen, handle retries and optionally show remaining time.
- After a successful OTP verification, redirect to login or refresh the user state.
