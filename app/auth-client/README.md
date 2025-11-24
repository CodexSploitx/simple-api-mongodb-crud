# Auth Client Admin Dashboard

## Overview

A Supabase-style admin panel for managing Auth Client users at `/auth-client`.

## Features

- 🔐 **Secure Admin Login** - Credentials from `.env.local`
- 👥 **User Management** - View all registered users
- 🗑️ **Delete Users** - Remove users with confirmation
- 🔄 **Revoke Tokens** - Invalidate all user sessions
- 🔑 **Change Passwords** - Update user passwords with validation
- 🎨 **Modern UI** - Built with project color palette

## Configuration

Add to `.env.local`:

```env
# Admin Credentials
USERNAME_AUTH_CLIENT=admin
PASSWORD_AUTH_CLIENT=your-secure-password

# JWT for Admin Operations
JWT_AUTH=your-long-random-secret-key

# Database (already configured)
AUTH_CLIENT_DB=authclient
AUTH_CLIENT_COLLECTION=users
```

### Auth Client Access Mode (RLS)

To allow Auth Client users to consume the `app/api` CRUD endpoints with row-level security (RLS), add this to `.env.local`:

```env
# Auth Client access mode toggle
RELACIONALDB_AUTH_CLIENT=true

# Secret used to sign/verify access JWTs (Auth Client)
JWT_SECRET=your-long-random-secret
```

- When `RELACIONALDB_AUTH_CLIENT=true`, CRUD endpoints require `Authorization: Bearer <accessToken>` returned on register/login.
- When `RELACIONALDB_AUTH_CLIENT=false`, Auth Client users CANNOT consume the CRUD APIs.

The token used to call the APIs is the **Access Token** returned by:
- `POST /api/auth-client/register` → response includes `accessToken`
- `POST /api/auth-client/login` → response includes `accessToken`

The `accessToken` is signed with `JWT_SECRET` and includes `userId`, `email`, `username`, and `version`.

## Usage

1. Navigate to `http://localhost:3000/auth-client`
2. Login with admin credentials
3. View and manage users:
   - **Password**: Change user password (validates complexity)
   - **Revoke**: Invalidate all user tokens (increments tokenVersion)
   - **Delete**: Permanently remove user (requires confirmation)

### Consuming CRUD APIs with Auth Client enabled

1. Register or log in:
   - `POST /api/auth-client/register`
   - `POST /api/auth-client/login`
   Retrieve `accessToken` from the response.

2. Send the `accessToken` in the header:

```http
Authorization: Bearer <accessToken>
```

3. Examples:

```bash
# Find your own documents (RLS by ownerId)
curl -X POST "http://localhost:3000/api/find" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"db":"myDatabase","collection":"users","query":{"status":"active"}}'

# Insert document: backend will add ownerId=<userId>
curl -X POST "http://localhost:3000/api/insertOne" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"db":"myDatabase","collection":"users","document":{"key":"value"}}'

# Update only your documents
curl -X PUT "http://localhost:3000/api/updateOne" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"db":"myDatabase","collection":"users","filter":{"_id":"<id>"},"update":{"$set":{"key":"new"}}}'

# Delete only your documents
curl -X DELETE "http://localhost:3000/api/deleteOne" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"db":"myDatabase","collection":"users","filter":{"_id":"<id>"}}'
```

4. Access token renewal:
   - Use `POST /api/auth-client/refresh` (requires `refreshToken` httpOnly cookie) to get a new `accessToken`.

### RLS Rules (Row-Level Security)

- Reads (`find`, `findOne`, `GET /api/:db/:collection`) filter by `ownerId = <userId>`.
- Inserts automatically add `ownerId = <userId>`.
- Updates and deletes enforce `filter.ownerId = <userId>`.
- If the user's `tokenVersion` changes (revoked), access is denied.

## Security

- All operations require JWT_AUTH token validation
- Double confirmation for sensitive actions
- Rate limiting on login (5 attempts/min)
- Passwords never exposed in API responses
- Session stored in sessionStorage (1 hour expiry)
  
> Note: Admin operations in this panel use `JWT_AUTH` and are independent from user `accessToken`s.

## API Endpoints

### Admin Login

`POST /api/auth-client/admin/login`

- Body: `{ username, password }`
- Returns: `{ success, token }`

### Get Users

`GET /api/auth-client/admin/users`

- Headers: `Authorization: Bearer <token>`
- Returns: `{ success, users[] }`

### Delete User

`DELETE /api/auth-client/admin/users/[id]`

- Headers: `Authorization: Bearer <token>`
- Returns: `{ success, message }`

### Revoke Tokens

`PATCH /api/auth-client/admin/users/[id]`

- Body: `{ action: "revokeTokens" }`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ success, newTokenVersion }`

### Change Password

`PATCH /api/auth-client/admin/users/[id]`

- Body: `{ action: "changePassword", newPassword }`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ success, message }`
