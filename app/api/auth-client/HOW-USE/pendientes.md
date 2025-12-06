# Pending Improvements (Auth-Client)

## Urgent (must-have now)
- Harden secrets: require `JWT_AUTH_CLIENT` and `STMP_ENCRYPTION_KEY` with no defaults.
- Unify admin secrets: consistently use `JWT_AUTH_CLIENT_ADMIN` for login and verification.
- Robust magic link: token with `crypto.randomBytes(32)` + `jti` and firm expiry; sanitize HTML when sending.
- Secure OTP: store `hash(code)` (HMAC-SHA256) and create TTL index on `expiresAt` in `STMP_OTP`.
- Refresh rotation: in `/api/auth-client/refresh` issue a new `refreshToken`, set the cookie and prepare reuse detection.
- CSRF: protect cookie-using endpoints (`refresh`, change email/password, critical actions) with double-submit or Origin-check.

## High priority
- Admin isolation: move `requireAuthClientAdmin` to `AUTH_CLIENT_DB` with its own role, without reading `permissions.*` from the main system.
- JWT claims: add `aud`, `iss`, `sub`, `jti` and validate HS256 explicitly.
- Password hashing: raise bcrypt cost to 12 or migrate to Argon2 if feasible.
- Consistent sanitization: apply HTML sanitization to all sends (including magic link) and centralize in a utility.
- Template placeholders: validate and only allow `{{ .EmailUSer }}`, `{{ .UserName }}`, `{{ .CodeConfirmation }}`, `{{ .SiteURL }}`, `{{ ._id }}`; avoid `{{ .permissions.* }}` and `{{ .Token }}` unless strictly required.
- Unique indexes: `users.email` and `users.username` with unique index; validate collisions.
- Login blocking if `suspended === true` and uniform error messages.
- Persistent rate limit: store counters per IP/user in DB/Redis for resilience and to avoid bypass in multi-instance.

## Medium priority
- Outbox worker: process `STMP_OUTBOX` with a job/worker that respects `minIntervalSeconds`, retries and backoff.
- Refresh reuse: detect and invalidate sessions if an old refresh is reused (token theft mitigation).
- Reauth token: make `REAUTH_TOKEN_EXPIRES_IN` configurable, include `aud/iss/jti` and strictly verify `action`.
- Security headers: add `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` suitable for emails and endpoints.
- Zod validations: harden max sizes and formats where missing; consistent messages.
- OTP attempt control: `otpCooldownSeconds`, `otpMaxPerHour`, and policy of one active OTP per event.
- Audit: log key events (login, reset, reauth, magic link, change email) with minimal non-sensitive metadata.
- Password policies: optionally check compromised passwords (e.g., Pwned Passwords).

## Low priority
- Observability: metrics and structured logs; request-id traceability.
- Tests: unit and e2e for login/refresh/OTP/magic link/change email/reauth.
- Performance: TTL indexes and periodic cleanup of `otp`, `magiclinks`, `outbox`, `changeemail` collections.
- UX and i18n: consistent error messages, multi-language support.
- Environment docs: specify all required variables and secure values.
- Secret management: periodic rotation and vault storage.
- Anti-bot protection: optional, add CAPTCHA in registration/login/OTP flows if risk warrants.

## Implementation notes
- Startup config: strictly validate presence of secrets and CORS origins; fail fast if missing.
- Cookie consistency: `HttpOnly`, `SameSite=Strict`, `Secure` in production, and controlled path scopes.
- Unified statuses and codes: use `401/403/404/429/410` coherently; avoid information leaks.

## Code references (where to change)
- JWT secrets: `lib/auth.ts:7`, `lib/auth.ts:92`, `app/api/auth-client/admin/login/route.ts:6`.
- Magic link: `app/api/auth-client/magic-link/send/route.ts:58-83`, `consume/route.ts:37-58`.
- OTP: `app/api/stmp/templates/route.ts`, `app/api/auth-client/reset-password/request/route.ts:44-49`, `reauth/request/route.ts:45-50`, `change-email/start/route.ts:67-72`, `request-new/route.ts:48-53`.
- Refresh: `app/api/auth-client/refresh/route.ts:58-64`.
- Admin isolation: `lib/auth.ts:102-115`, `app/api/auth-client/admin/login/route.ts`.
