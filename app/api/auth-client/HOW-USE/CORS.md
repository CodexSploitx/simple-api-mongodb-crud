# CORS in Auth-Client

Practical guide to enable, configure, and understand CORS behavior in the Auth-Client module.

## Overview
- When `CORS` is enabled, browser requests only succeed if the `Origin` header matches the allowed list.
- If the `Origin` is not allowed, the endpoint returns `403` with `error: "Blocked by CORS: Origin not allowed"`.
- Responses include `Access-Control-Allow-Origin` (when allowed) and `Vary: Origin`.
- Host matching is supported: different protocol (`http`/`https`) but same host is allowed. See `lib/cors.ts:37-49`.

## Configure in the UI
1. Open the Admin panel: `Auth Client`.
2. In the sidebar, go to `Settings` → tab `CORS`.
3. You can:
   - Toggle CORS whitelist on/off.
   - Add, edit, and delete `Allowed origins`.

Relevant components:
- Tabs: `app/auth-client/page.tsx:20-24` defines `SMTP` under `Notifications` and `CORS` under `Settings`.
- CORS panel render: `app/auth-client/page.tsx:162-163`.
- CORS UI behavior: `app/auth-client/components/STMPConfiguration.tsx:14-37,66-88,90-112,114-161,164-266`.

UI validations:
- Origin must start with `http://` or `https://`. See `app/auth-client/components/STMPConfiguration.tsx:117-120,152-155`.
- No duplicates allowed. See `app/auth-client/components/STMPConfiguration.tsx:121-123`.

## Configure via API
Endpoint: `GET/POST /api/auth-client/admin/settings`

CORS fields:
- `cors_enabled: boolean`
- `cors_allowed_origins: string[]`

Enable CORS:
```bash
curl -X POST "http://localhost:3000/api/auth-client/admin/settings" \
  -H "Content-Type: application/json" \
  --data '{ "cors_enabled": true }'
```

Set allowed origins:
```bash
curl -X POST "http://localhost:3000/api/auth-client/admin/settings" \
  -H "Content-Type: application/json" \
  --data '{ "cors_allowed_origins": ["http://localhost:3000", "https://my-domain.com"] }'
```

Read settings:
```bash
curl -s "http://localhost:3000/api/auth-client/admin/settings"
```

## Endpoints with CORS
Auth-Client enforces CORS across key routes. Examples:
- `POST /api/auth-client/register` → `app/api/auth-client/register/route.ts:14-25`
- `POST /api/auth-client/login` (and variants)
- `POST /api/auth-client/change-password`
- `POST /api/auth-client/logout` → `app/api/auth-client/logout/route.ts:1-18`
- `POST /api/auth-client/refresh`
- Admin: `POST /api/auth-client/admin/login`, `GET/DELETE/PATCH /api/auth-client/admin/users[...]`

Headers and validation:
- Headers: `lib/cors.ts:51-68`
- Origin validation: `lib/cors.ts:37-49`

## Environment variables (fallback)
If DB settings cannot be read:
- `CORS` (`true/false`) controls whether CORS is enabled. See `lib/cors.ts:3-13`.
- `CORS_AUTH_CLIENT` is a comma-separated list of allowed origins. See `lib/cors.ts:15-26`.

## Deployment tips
- Always add your production domain to `cors_allowed_origins`.
- Test with `Origin`:
```bash
curl -X POST "http://localhost:3000/api/auth-client/register" \
  -H "Origin: https://my-domain.com" \
  -H "Content-Type: application/json" \
  --data '{ "email": "user@example.com", "username": "user", "password": "Secret123!" }'
```
- Expect `403` with `Blocked by CORS: Origin not allowed` if the origin is not whitelisted.

## Notes
- Headers are centralized in `lib/cors.ts:51-68`.
- The CORS panel lives in `STMPConfiguration` and is shown under `Settings → CORS`.
