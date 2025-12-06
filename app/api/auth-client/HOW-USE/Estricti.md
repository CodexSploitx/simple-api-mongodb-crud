# Auth-Client: definition and boundaries

## What it is
- Independent authentication microservice for client applications.
- Manages users in `AUTH_CLIENT_DB` and `AUTH_CLIENT_COLLECTION`.
- Issues `accessToken` (JWT) and maintains `refreshToken` in an HTTP-only cookie.
- Minimal user model:
  - `_id`, `email`, `username`, `password` (hash), `tokenVersion`, `createdAt`, `updatedAt`, `verifiEmail`.

## What it is NOT
- It is not the login for the main MongoDB CRUD app.
- It does not use or mix collections/DB from the main app (`AUTH_DB_USERS`, `AUTH_DB_COLLECTION`).
- It does not handle CRUD permissions nor fields like `permissions.*` or `authClientAccess`.
- Do not include `{{ .permissions.* }}` nor `{{ .Token }}` in templates.

## Environment (Auth-Client only)
- `AUTH_CLIENT_DB=authclient`
- `AUTH_CLIENT_COLLECTION=users`
- `AUTH_CLIENT_DELETE_USERS=deleteusers`
- `JWT_AUTH_CLIENT` and `JWT_AUTH_CLIENT_EXPIRATION`
- `CORS_AUTH_CLIENT`, `RELACIONALDB_AUTH_CLIENT`

## Main endpoints
- `POST /api/auth-client/register` creates user and returns `accessToken`.
- `POST /api/auth-client/login` validates credentials and returns `accessToken`.
- `POST /api/auth-client/refresh` renews `accessToken` using `refreshToken`.

## Email verification (OTP)
- Central settings via `GET/POST /api/stmp/settings`.
- Flag `requireEmailVerificationLogin` enforces `verifiEmail === true` for login.
- OTP flow:
  - Email send using active template of `confirm_sign_up` (`/api/stmp/send` or automatic after registration if event is active).
  - Verification `POST /api/stmp/otp/verify` sets `verifiEmail: true`.
  - Login rejects with `403 Email not verified` when the flag is active and the user has not verified.

## SMTP templates (supported placeholders)
- `{{ .EmailUSer }}` user email
- `{{ .UserName }}` user name
- `{{ .CodeConfirmation }}` OTP code
- `{{ .SiteURL }}` site URL
- `{{ ._id }}` user ID
- Do not use `{{ .permissions.* }}` nor `{{ .Token }}`.

## Strict isolation
- Import and query only `AUTH_CLIENT_DB/ AUTH_CLIENT_COLLECTION` for users.
- Do not read or write to the main app collections.
- Keep permissions logic outside Auth-Client.
- Templates and SMTP settings live in the microservice's SMTP configuration/collections.

## Quick checklist
- [ ] Are you using `AUTH_CLIENT_DB` and `AUTH_CLIENT_COLLECTION`?
- [ ] Does login enforce `requireEmailVerificationLogin` from DB?
- [ ] No references to `permissions.*` nor main app collections?
- [ ] Do templates use only supported placeholders?
