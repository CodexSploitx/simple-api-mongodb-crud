# Auth Client API Documentation

This API provides a production-ready, secure, and robust authentication system designed for modern web applications. It implements industry best practices for session management, input validation, and attack mitigation.

## 🚀 Key Features

- **Dual Token Architecture**: Uses short-lived **Access Tokens** (15 min) for API access and long-lived **Refresh Tokens** (7 days) for session renewal.
- **Stateless & Scalable**: Built on JWT (JSON Web Tokens), making it suitable for serverless and distributed systems.
- **Type-Safe**: Built with TypeScript and **Zod** for strict runtime validation.
- **Database Agnostic**: Currently implemented for MongoDB, but structured to be adaptable.

## 🛡️ Security Measures

This API is hardened against common web vulnerabilities:

### 1. Secure Session Management

- **HTTP-Only Cookies**: The Refresh Token is stored in an `httpOnly` cookie, making it inaccessible to client-side JavaScript and preventing XSS token theft.
- **Secure Attributes**: Cookies are set with `Secure` (HTTPS only in production) and `SameSite=Strict` to prevent CSRF attacks.
- **Token Versioning**: Each user has a `tokenVersion`. This allows for **immediate server-side revocation** of all sessions (e.g., after password change or account compromise) by simply incrementing the version in the database.

### 2. Attack Mitigation

- **Rate Limiting**: Built-in protection against brute-force and denial-of-service (DoS) attacks.
  - **Login**: Max 10 attempts per minute per IP.
  - **Register**: Max 5 attempts per minute per IP.
- **Password Hashing**: Passwords are hashed using **bcryptjs** with a salt work factor of 10.
- **Input Sanitization**: All inputs are validated and sanitized using Zod schemas to prevent injection attacks (NoSQL Injection, etc.).

### 3. Strict Validation Rules

- **Password Complexity**:
  - Minimum 6 characters, Maximum 64.
  - Must contain at least 1 Uppercase letter.
  - Must contain at least 1 Lowercase letter.
  - Must contain at least 1 Symbol/Special character.
- **Email & Username**: Strict format validation to prevent malformed data.

### 4. CORS Configuration

- Dynamic Cross-Origin Resource Sharing (CORS) support.
- Configurable via environment variables (`CORS=true/false`, `CORS_AUTH_CLIENT`) to restrict access to trusted domains only.

---

## 📚 API Reference

### Base URL: `/api/auth-client`

### 1. Register User

**POST** `/register`

- **Body**: `{ "email": "...", "username": "...", "password": "..." }`
- **Returns**: `201 Created` with `accessToken` and User object.
- **Security**: Rate limited (5/min).

### 2. Login

**POST** `/login`

- **Body**: `{ "identifier": "email OR username", "password": "..." }`
- **Returns**: `200 OK` with `accessToken`. Sets `refreshToken` cookie.
- **Security**: Rate limited (10/min).

### 3. Refresh Token

**POST** `/refresh`

- **Headers**: Cookie `refreshToken=...` (Sent automatically by browser).
- **Returns**: `200 OK` with new `accessToken`.
- **Security**: Verifies `tokenVersion` against DB.

### 4. Logout

**POST** `/logout`

- **Returns**: `200 OK`. Clears the `refreshToken` cookie.

---

### 5. Change Password

**POST** `/change-password`

- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**: `{ "currentPassword": "...", "newPassword": "..." }`
- **Returns**: `200 OK` with new `accessToken`. Sets new `refreshToken` cookie.
- **Security**:
  - Authenticated users only (valid Access Token required).
  - Rate limited (5/min).
  - Increments `tokenVersion` to revoke all previous tokens.

Usage example:

```bash
curl -X POST "http://localhost:3000/api/auth-client/change-password" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"oldPass123!","newPassword":"NewPass123!"}'
```

Notes:
- After a successful change, all previously issued tokens are invalid. Use the returned `accessToken` and the new `refreshToken` cookie for subsequent requests.
- Password must follow complexity rules listed above.

## 🛠️ Configuration (.env.local)

```env
# Database
AUTH_CLIENT_DB=authclient
AUTH_CLIENT_COLLECTION=users

# Security
JWT_SECRET=your-super-secret-key-min-32-chars
CORS=true
CORS_AUTH_CLIENT=http://localhost:3000
```
