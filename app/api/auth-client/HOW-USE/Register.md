# Register: User Sign Up Flow

This guide explains how the `POST /api/auth-client/register` endpoint validates input, persists the user, issues tokens, sets cookies, and optionally queues email-verification messages.

## Endpoint

- Path: `/api/auth-client/register`
- Method: `POST`
- CORS: governed by `lib/cors.ts`; blocked when origin is not allowed
- Rate limit: `5` requests per minute per IP

## Request Body

The request must match `RegisterSchema` (`lib/validations.ts:3-13`):

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "P@ssw0rd!"
}
```

Validation rules:
- `email`: valid email format
- `username`: min length 3
- `password`: 6–64 chars, includes uppercase, lowercase, and at least one symbol

## Headers Used

- `User-Agent`: parsed into `device` meta (type, OS, browser, version)
- `Accept-Language`: first language is stored in `locale.language` (raw header also kept)
- `x-forwarded-for` / `x-real-ip`: used to determine IP (first value)
- `x-vercel-ip-country` / `cf-ipcountry` / `x-geo-country`: fallback for country

## Optional Geo Lookup

- Controlled by `ENABLE_GEO_LOOKUP="true"`
- If enabled and IP is known, performs a fast lookup using `https://ipapi.co/<ip>/json/` with a 2s timeout
- Stores country, region, city, latitude, longitude, ISP, and ASN when available

## Persistence

Target collection: `process.env.AUTH_CLIENT_DB || "authclient"` + `process.env.AUTH_CLIENT_COLLECTION || "users"`

Before insert, duplicates are checked by `email` or `username`. When unique, a document similar to this is stored (`app/api/auth-client/register/route.ts:110-127`):

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "<bcrypt hash>",
  "tokenVersion": 0,
  "verifiEmail": true | false,
  "createdAt": "<Date>",
  "updatedAt": "<Date>",
  "registrationMeta": {
    "ip": {
      "address": "203.0.113.42",
      "source": "x-forwarded-for",
      "country": "Country",
      "region": "Region",
      "city": "City",
      "latitude": 0,
      "longitude": 0,
      "isp": "ISP",
      "asn": "AS12345"
    },
    "userAgent": "<UA>",
    "device": { "type": "mobile|desktop|tablet|bot", "os": "Windows|macOS|...", "browser": "Chrome|Safari|...", "version": "<ver>" },
    "locale": { "language": "en-US", "raw": "en-US,en;q=0.9" },
    "demographics": {},
    "timestamp": "<Date>"
  }
}
```

Notes:
- `verifiEmail` initial value depends on SMTP config (`requireEmailVerificationLogin`). If email verification is required to login, it starts as `false`.

## Tokens & Cookies

- Access Token: JWT returned in response (`accessToken`) with claims `{ userId, email, username, version }`
- Refresh Token: JWT set as an `HttpOnly` cookie `refreshToken` (7 days, `SameSite=strict`, `secure` in production)

Cookie example:

```
Set-Cookie: refreshToken=<jwt>; HttpOnly; Path=/; Max-Age=604800; SameSite=strict; Secure
```

## Email Verification (Optional)

If `confirm_sign_up` event is enabled in SMTP config, the system:
- Picks the active template for `confirm_sign_up`
- Optionally generates a numeric OTP (6 digits) if the template contains `{{ .CodeConfirmation }}`
- Stores OTP in the `STMP_OTP` collection with TTL semantics
- Queues an email in `STMP_OUTBOX` and attempts immediate send for convenience

Template placeholders supported in this flow:
- `{{ .EmailUSer }}` — recipient email
- `{{ .UserName }}` — username
- `{{ ._id }}` — user id
- `{{ .SiteURL }}` — `API_BASE_URL` (if set)
- `{{ .CodeConfirmation }}` — OTP when generated

## Response

On success (`201`):

```json
{
  "message": "User registered successfully",
  "user": { "id": "<ObjectId>", "email": "user@example.com", "username": "johndoe" },
  "accessToken": "<jwt>"
}
```

On errors:
- `400`: validation errors (Zod details included)
- `403`: blocked by CORS (when enabled)
- `409`: user already exists (duplicate email/username)
- `429`: rate limit exceeded
- `500`: internal errors

## Usage Examples

Curl:

```bash
curl -X POST "http://localhost:3000/api/auth-client/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"johndoe","password":"P@ssw0rd!"}'
```

Fetch:

```js
fetch("/api/auth-client/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com", username: "johndoe", password: "P@ssw0rd!" })
})
  .then(r => r.json())
  .then(console.log);
```

Axios:

```js
import axios from "axios";
const { data } = await axios.post("/api/auth-client/register", {
  email: "user@example.com",
  username: "johndoe",
  password: "P@ssw0rd!"
});
```

## Environment

Relevant variables:
- `AUTH_CLIENT_DB`, `AUTH_CLIENT_COLLECTION` — target DB/collection
- `JWT_SECRET` — required for signing tokens
- `ENABLE_GEO_LOOKUP` — enables IP geolocation
- `API_BASE_URL` — used in email templates
- `STMP_OTP`, `STMP_OUTBOX` — collections for OTP and outbox
- SMTP config and templates via `lib/stmp.ts`

## References

- Route: `app/api/auth-client/register/route.ts`
- Validations: `lib/validations.ts`
- CORS: `lib/cors.ts`
- Rate limit: `lib/rate-limit.ts`
