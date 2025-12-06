# Reauthentication (Auth-Client)

Requires users to reauthenticate before sensitive actions. It relies on an OTP via email and issues a short-lived `reauthToken` that must be sent in the `x-reauth-token` header when performing the action.

## Requirements
- User in `AUTH_CLIENT_DB`.`AUTH_CLIENT_COLLECTION`.
- `reauthentication` event active in SMTP.
- Active template for `reauthentication` (auto-generated if missing).
- Action toggles in `SMTP settings` to enforce reauth.

## Toggle and templates
- Activate event: `POST /api/stmp/events` with `{ "eventKey": "reauthentication", "active": true }`.
- Default template is created if missing: `app/api/stmp/events/route.ts:143-151`.

### Supported placeholders
- `{{ .EmailUSer }}`: email
- `{{ .UserName }}`: display name
- `{{ .CodeConfirmation }}`: 6-digit OTP code
- `{{ .SiteURL }}`: base URL
- `{{ ._id }}`: user ID

## Reauth flow
1) Request OTP
- Endpoint: `POST /api/auth-client/reauth/request` with Bearer `accessToken`
- Sends email with OTP and records outbox
- References:
  - OTP insert: `app/api/auth-client/reauth/request/route.ts:42-50`
  - Send and outbox: `app/api/auth-client/reauth/request/route.ts:85-92`

2) Confirm OTP and obtain `reauthToken`
- Endpoint: `POST /api/auth-client/reauth/confirm` with Bearer `accessToken`
- Body: `{ "code": "123456", "action": "<optional>" }`
- Returns `{ reauthToken, expiresInSeconds }` (default 300s)
- References:
  - OTP validation: `app/api/auth-client/reauth/confirm/route.ts:31-46`
  - Token generation: `app/api/auth-client/reauth/confirm/route.ts:52-54`, `lib/auth.ts:45-55`

3) Execute sensitive action with `x-reauth-token`
- Send header `x-reauth-token: <reauthToken>` along with `Authorization: Bearer <accessToken>`
- The action validates the token belongs to the user and, if `action` was set in the token, that it matches the required action.

## Supported sensitive actions
- Change password: `POST /api/auth-client/change-password`
  - Gating: `app/api/auth-client/change-password/route.ts:58-67`
  - Body: `{ "currentPassword": "***", "newPassword": "***" }`
- Change email (start): `POST /api/auth-client/change-email/start`
  - Gating: `app/api/auth-client/change-email/start/route.ts:54-62`
  - Body: `{ "currentEmail": "user@example.com", "password": "***" }`
  - Then follow the change-email flow (own OTP steps)
- Delete account: `POST /api/auth-client/delete-account`
  - Gating: `app/api/auth-client/delete-account/route.ts:21-29`
- Critical action (defined): `POST /api/auth-client/critical-action`
  - Gating: `app/api/auth-client/critical-action/route.ts:27-35`
  - Body: `{ "type": "suspend_account", "reason": "<optional>" }`
  - Suspension implementation: `app/api/auth-client/critical-action/route.ts:40-49`

## Reauth toggles (per action)
- Endpoint: `GET/POST /api/stmp/settings`
- Fields:
  - `requireReauthChangePassword`
  - `requireReauthChangeEmail`
  - `requireReauthDeleteAccount`
  - `requireReauthCriticalAction`
- Read/update: `app/api/stmp/settings/route.ts:34-38,47-81`

## Common errors
- `401 { error: "Reauthentication required" }` if `x-reauth-token` is missing or mismatched.
- `404 { error: "User not found" | "Code not found" }`.
- `410 { error: "Code expired" }`.
- `429 { error: "Too many attempts" }` when OTP attempts exceed limit.

## Examples
- Request OTP:
```bash
curl -X POST "http://localhost:3000/api/auth-client/reauth/request" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
- Confirm OTP and get token:
```bash
curl -X POST "http://localhost:3000/api/auth-client/reauth/confirm" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "123456", "action": "change_password" }'
```
- Use in change password:
```bash
curl -X POST "http://localhost:3000/api/auth-client/change-password" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "x-reauth-token: <REAUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "currentPassword": "Old123!", "newPassword": "New456!" }'
```
- Use in delete account:
```bash
curl -X POST "http://localhost:3000/api/auth-client/delete-account" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "x-reauth-token: <REAUTH_TOKEN>"
```
- Critical action (suspend account):
```bash
curl -X POST "http://localhost:3000/api/auth-client/critical-action" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "x-reauth-token: <REAUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "type": "suspend_account", "reason": "policy breach" }'
```

## Best practices
- Tune `otpTtlSeconds` and `otpMaxAttempts` to your security needs.
- If you define `action` in `reauth/confirm`, use the same verb in the route gating (`"change_password"`, `"change_email"`, `"delete_account"`, `"critical_action"`).
- Always send `x-reauth-token` when the action's toggle is active.
