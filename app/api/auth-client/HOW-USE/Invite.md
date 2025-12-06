# "Invite user" event

Guide to integrate sending registration invitations to new users from Auth-Client.

## What it is
- Allows an authenticated user to send an invitation email to another person to register.
- The email is rendered with the `invite_user` event template and supports optional variables for promos/rewards.

## Prerequisites
- You must be authenticated with Auth-Client to send invitations.
- An active template for the `invite_user` event must exist in the template editor.
  - Editor and placeholders for the event: `app/auth-client/components/Templates/TemplatesModal.tsx:122-141`.

## Settings
- Managed via `GET/POST /api/stmp/settings`.
- Relevant fields:
  - `inviteTokenTtlHours`: token lifetime in hours (TTL).
  - `inviteCooldownSeconds` and `inviteMaxPerHour`: available values for rate control; the endpoint currently uses `inviteTokenTtlHours` to calculate token expiration.
- Settings implementation: `app/api/stmp/settings/route.ts:6-14`, `16-32`, `34-75`.

## Supported placeholders
Only available in `invite_user` event templates:
- `{{ .EmailUSer }}`: invitee email
- `{{ .UserName }}`: invitee display name (derived from email if missing)
- `{{ .Token }}`: invitation token generated and stored
- `{{ .SiteURL }}`: site/API base URL
- Optional depending on what the client sends:
  - `{{ .PromoCode }}`
  - `{{ .RewardTitle }}`
  - `{{ .RewardText }}`

In the UI, these placeholders appear only when `eventKey === "invite_user"`. See: `app/auth-client/components/Templates/TemplatesModal.tsx:132-141`, `143-156`.

## Send endpoint
`POST /api/auth-client/invitations/send`

- Authentication: required (only logged-in users).
- JSON Body:
```json
{
  "email": "invitee@example.com",
  "promoCode": "WELCOME10",
  "rewardTitle": "Welcome Bonus",
  "rewardText": "Get 10% off on your first purchase."
}
```
- Response:
  - `200 OK { "success": true, "token": "<INVITE_TOKEN>" }`
  - Common errors: `400 { error: "Invalid email" }`, `404 { error: "No active template" }`, `400 { error: "Event not active" }`.

Implementation: `app/api/auth-client/invitations/send/route.ts:10-13`, `17-26`, `27-39`.

## Processing flow
1. Validate and authenticate the requester.
2. Read SMTP configuration and verify `invite_user` is active.
3. Select active template for `invite_user`.
4. Generate token and persist invitation with `expiresAt`.
5. Render placeholders and enqueue in `outbox` for SMTP send.
6. Attempt immediate send; if it fails, the email remains queued.

Key references:
- Token generation and persistence: `app/api/auth-client/invitations/send/route.ts:41-47`.
- Placeholder replacement: `app/api/auth-client/invitations/send/route.ts:50-59`.
- Enqueue and send: `app/api/auth-client/invitations/send/route.ts:64-72`.

## Persistence and security
- Invitations are stored in the `STMP_INVITES` collection (default `invites`) within the SMTP `db`. See: `app/api/auth-client/invitations/send/route.ts:41-47`.
- Token TTL: defined by `inviteTokenTtlHours` and used to compute `expiresAt`. See: `app/api/auth-client/invitations/send/route.ts:43-45`.
- Only authenticated users can create invitations. See: `app/api/auth-client/invitations/send/route.ts:11-13`.
- Email HTML sanitization is performed during the send process; the editor also sanitizes for `preview`.

## Build the invitation link
- Use `{{ .Token }}` in your template to embed the token in a link, for example:
```html
<a href="{{ .SiteURL }}/register?invite={{ .Token }}">Register now</a>
```
- The application that handles the link should read `invite` from the query string and apply it to its registration flow.

## Example cURL
```bash
curl -X POST "http://localhost:3000/api/auth-client/invitations/send" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
        "email":"invitee@example.com",
        "promoCode":"WELCOME10",
        "rewardTitle":"Welcome Bonus",
        "rewardText":"Get 10% off on your first purchase."
      }'
```

## Best practices
- Do not include sensitive data in the invitation HTML.
- Keep only one active template per event to avoid confusion.
- Adjust `inviteTokenTtlHours` per your desired link expiration policy.
- Keep `inviteCooldownSeconds` and `inviteMaxPerHour` under control if you integrate rate limiters.
