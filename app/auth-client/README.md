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

## Usage

1. Navigate to `http://localhost:3000/auth-client`
2. Login with admin credentials
3. View and manage users:
   - **Password**: Change user password (validates complexity)
   - **Revoke**: Invalidate all user tokens (increments tokenVersion)
   - **Delete**: Permanently remove user (requires confirmation)

## Security

- All operations require JWT_AUTH token validation
- Double confirmation for sensitive actions
- Rate limiting on login (5 attempts/min)
- Passwords never exposed in API responses
- Session stored in sessionStorage (1 hour expiry)

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
