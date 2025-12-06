# Magic Link: One-time sign-in via email

Guide to integrate the `magic_link` event and allow users to sign in with a one-time email link, without a password.

## What it is
- Sends a one-time link to the user's email.
- Consuming the link issues an `accessToken` and sets `refreshToken` as an HTTP-only cookie.

## Prerequisites
- The user must exist in `AUTH_CLIENT_DB`.`AUTH_CLIENT_COLLECTION`.
- `magic_link` event must be active in SMTP settings (required toggle). If disabled, the send endpoint returns `400 { "error": "Magic link deactivated: event not active" }`.
- An active template for `magic_link` must exist (the default can be auto-generated).

## Activate event and default template
- Endpoint: `POST /api/stmp/events`
- Body: `{ "eventKey": "magic_link", "active": true }`
- If no active template exists, the default is created automatically.
- Implementation: `app/api/stmp/events/route.ts:22-59` and default: `app/api/stmp/events/route.ts:112-121`.

## Supported placeholders (only `magic_link`)
- `{{ .EmailUSer }}`: user email
- `{{ .UserName }}`: display name (derived from email if missing)
- `{{ .Token }}`: magic link token
- `{{ .SiteURL }}`: site/API base URL
- `{{ ._id }}`: user ID
- In the template editor, these appear only for `magic_link`: `app/auth-client/components/Templates/TemplatesModal.tsx:122-141`, `app/auth-client/components/Templates/TemplatesModal.tsx:143-148`.

## Send the link
- Endpoint: `POST /api/auth-client/magic-link/send`
- Body:
```json
{ "email": "user@example.com" }
```
- Responses:
- `200 OK { "success": true, "token": "<MAGIC_TOKEN>" }`
- `400 { error: "Invalid email" }`, `404 { error: "User not found" }`, `400 { error: "Magic link deactivated: event not active" }`
- Implementation: `app/api/auth-client/magic-link/send/route.ts:9-25`, `27-39`, `41-47`, `60-72`.

## Consume the link (sign in)
- GET: `GET /api/auth-client/magic-link/consume?token=<MAGIC_TOKEN>`
- POST: `POST /api/auth-client/magic-link/consume` with body `{ "token": "<MAGIC_TOKEN>" }`
- Success response:
```json
{ "success": true, "accessToken": "...", "user": { "id": "...", "email": "...", "username": "..." } }
```
- Effects:
- Marks the token as used.
- Sets `refreshToken` cookie (HTTP-only, `SameSite=strict`, `Max-Age=7 days`).
- Sets `verifiEmail: true` for the user (if not already).
- Implementation: `app/api/auth-client/magic-link/consume/route.ts:61-70`, `72-86`, flow: `16-59`.

## Default Magic Link template
- Subject: "Your magic link".
- HTML builds a button with `{{ .Token }}` and `{{ .SiteURL }}`.
- Auto-generated when activating the event: `app/api/stmp/events/route.ts:112-121`.

## TTL configuration
- `magicLinkTtlMinutes`: the token's validity in minutes.
- Read from `stmpdb.config` if present; default 60 minutes.
- Used in: `app/api/auth-client/magic-link/send/route.ts:41-47`.

## Examples
- Activate event and default template:
```bash
curl -X POST "http://localhost:3000/api/stmp/events" \
  -H "Content-Type: application/json" \
  -d '{ "eventKey": "magic_link", "active": true }'
```
- Send magic link:
```bash
curl -X POST "http://localhost:3000/api/auth-client/magic-link/send" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com" }'
```
- Consume magic link (GET):
```bash
curl -X GET "http://localhost:3000/api/auth-client/magic-link/consume?token=<MAGIC_TOKEN>" \
  -H "Accept: application/json"
```
- Consume magic link (POST):
```bash
curl -X POST "http://localhost:3000/api/auth-client/magic-link/consume" \
  -H "Content-Type: application/json" \
  -d '{ "token": "<MAGIC_TOKEN>" }'
```

## Best practices
- Keep a single active template per event.
- Do not include sensitive data in email HTML.
- Define a reasonable TTL for the token (`magicLinkTtlMinutes`).
- Enforce CORS in production.
