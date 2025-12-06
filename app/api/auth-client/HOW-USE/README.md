# Auth-Client HOW-USE Index (English)

A consolidated index of practical guides for integrating and operating the Auth-Client module.

## Guides
- Register: `./Register.md`
  - Input validation, persistence, tokens & cookies, optional email verification.
  - Route reference and usage examples.
- CORS: `./CORS.md`
  - Enable/disable whitelist, manage allowed origins, error behavior (`Blocked by CORS`).
  - UI: `Settings → CORS`. Tabs: `app/auth-client/page.tsx:20-24`. Render: `app/auth-client/page.tsx:162-163`.
  - Core: `lib/cors.ts:37-49`, `lib/cors.ts:51-68`.

- Email Verification via OTP: `./VerifiEmail.md`
  - Enforce verified emails before login via `confirm_sign_up` event.
  - UI: `Notifications → SMTP`. Endpoint examples and OTP flow.

- Magic Link: `./MagicLink.md`
  - One-time sign-in via email link; sets `refreshToken` cookie.
  - Event `magic_link`, default template and TTL.

- Reset Password: `./ResetPassword.md`
  - Unauthenticated and authenticated flows using OTP; revokes tokens.

- Change Email Address: `./ChangeEmail.md`
  - Double OTP verification (current and new email) with tokenVersion bump.

- Invite user: `./Invite.md`
  - Send registration invitations with optional promo/reward placeholders.

- Reauthentication for sensitive actions: `./Reauthentication.md`
  - OTP-driven `reauthToken` for change password/email, delete account, critical actions.

- Auth-Client: definition and boundaries: `./Estricti.md`
  - Scope, isolation, supported placeholders, environment.

- Pending Improvements: `./pendientes.md`
  - Roadmap: security, workers, rate limit, JWT claims, etc.

## Notes
- Sidebar organization: `Notifications → SMTP` and `Settings → CORS` (`app/auth-client/page.tsx:20-24`).
- All routes enforce consistent error codes and CORS headers as documented.
