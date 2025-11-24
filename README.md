# 🧩 MongoDB REST API

<div align="center">
  
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

### **Fast MongoDB API in Next.js + TypeScript**

_A **Modular and Secure** API for MongoDB, built with **Next.js**, designed to perform CRUD operations on any MongoDB database and collection_

**✨ Perfect for rapid prototyping, testing, and small to medium-sized projects ✨**

---

</div>

## 🚀 **Features**

<table>
  <tr>
    <td align="center" width="50%">
      <h3>🔌 Dynamic Connections</h3>
      <p>Instantly connect to any MongoDB database and collection</p>
    </td>
    <td align="center" width="50%">
      <h3>🔄 Full CRUD Support</h3>
      <p>Endpoints for <code>find</code>, <code>findOne</code>, <code>insertOne</code>, <code>updateOne</code>, <code>deleteOne</code></p>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <h3>🔐 Token Authentication</h3>
      <p>Protect your endpoints with a simple token (JWT or API_KEY)</p>
    </td>
    <td align="center" width="50%">
      <h3>🏗️ Modular Structure</h3>
      <p>Organize your code in folders like <code>app/api</code>, <code>services</code>, <code>middleware</code>, <code>lib</code>, <code>types</code>, <code>utils</code></p>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <h3>✅ Optional Validations</h3>
      <p>Use libraries like Zod to validate input data</p>
    </td>
    <td align="center" width="50%">
      <h3>⚡ Rapid Development</h3>
      <p>Perfect for quick setups and small to medium-sized projects</p>
    </td>
  </tr>
</table>

<div align="center">

### 🆕 **New Feature: Auth Client**

**A complete, production-ready Authentication API is now included!**
Register, Login, Refresh Tokens, Rate Limiting, and Secure Cookies out of the box.

</div>

---

## 📦 **Installation**

```bash
git clone https://github.com/CodexSploitx/simple-api-mongodb-crud.git
cd simple-api-mongodb-crud
pnpm install  # or npm install
```

### 3️⃣ Environment Setup

Create a `.env.local` file in the root directory:

```env
# 🗄️ Database Configuration
MONGODB_URI=mongodb://localhost:27017

# 🔐 Security Configuration
API_TOKEN=your_super_secret_token_here

```

> 💡 **Tip:** Generate a secure token at [IT-Tools Token Generator](https://it-tools.tech/token-generator)

---

## ▶️ **Getting Started**

```bash
pnpm start  # or npm run start

# To test MongoDB connection:
pnpm run mongotest
```

<div align="center">

**🌐 Server runs at: [http://localhost:3000](http://localhost:3000)**

</div>

---

## 🔐 **Authentication**

<div align="center">
  <img width="60" src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Locked.png" alt="🔒" />
</div>

**All endpoints require:**

```http
Authorization: Bearer your_secret_token
```

> ❌ **If missing or invalid, a `401 Unauthorized` is returned.**

---

## �️ **Auth Client (New!)**

<div align="center">
  <img width="60" src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Key.png" alt="🔑" />
</div>

We have implemented a **dedicated Authentication API** at `/api/auth-client` to handle user management for your applications.

**Features:**

- ✅ **User Registration & Login**
- ✅ **JWT Access Tokens** (15 min) & **Refresh Tokens** (7 days)
- ✅ **HttpOnly Secure Cookies**
- ✅ **Rate Limiting** (Brute-force protection)
- ✅ **Strict Password Validation**

**Endpoints:**

- `POST /api/auth-client/register`
- `POST /api/auth-client/login`
- `POST /api/auth-client/refresh`
- `POST /api/auth-client/logout`

### 🎛️ **Admin Dashboard**

We've also created an **Admin Dashboard** at `/auth-client` with a simple and optimized design to manage your users:

**Features:**

- 🔍 **Search Users** - Filter by email, username, or ID in real-time
- 👥 **View All Users** - Complete user list with registration details
- 🔑 **Change Passwords** - With secure password generator and copy button
- 🔄 **Revoke Tokens** - Invalidate all user sessions instantly
- 🗑️ **Delete Users** - Remove users with confirmation dialogs
- 🔐 **Secure Access** - Protected with admin credentials

> 📘 **Read the full documentation here:** [app/api/auth-client/README.md](app/api/auth-client/README.md)

---

## 🔒 Auth Client Access Mode (RLS)

When `RELACIONALDB_AUTH_CLIENT=true` in `.env.local`, users registered via **Auth Client** can consume all CRUD endpoints under `app/api` with **row-level security (RLS)**:

```env
RELACIONALDB_AUTH_CLIENT=true
AUTH_CLIENT_DB=authclient
AUTH_CLIENT_COLLECTION=users
JWT_SECRET=your-long-random-secret
```

- Required header: `Authorization: Bearer <accessToken>`
- The `accessToken` is obtained from `POST /api/auth-client/register` or `POST /api/auth-client/login` and is signed with `JWT_SECRET`.
- Reads (`/api/find`, `/api/findOne`, `GET /api/:db/:collection`) are filtered by `ownerId = <userId>`.
- Inserts (`/api/insertOne`) automatically add `ownerId = <userId>`.
- Updates (`/api/updateOne`) and deletes (`/api/deleteOne`) enforce `filter.ownerId = <userId>`.
- If `RELACIONALDB_AUTH_CLIENT=false`, Auth Client users do NOT have permission to consume the CRUD APIs.

### Recommended flow

1. Register or log in:
   - `POST /api/auth-client/register`
   - `POST /api/auth-client/login`
   - Store the `accessToken` from the response.

2. Use CRUD with the `accessToken`:

```bash
curl -X POST "http://localhost:3000/api/find" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"db":"myDatabase","collection":"users","query":{"status":"active"}}'

curl -X POST "http://localhost:3000/api/insertOne" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"db":"myDatabase","collection":"users","document":{"key":"value"}}'
```

3. Renew access token:
   - `POST /api/auth-client/refresh` returns a new `accessToken` if you have the `refreshToken` httpOnly cookie.

### Internal implementation (references)

- Access JWT generation/verification: `lib/auth.ts:25-39,41-65`
- Insert with `ownerId`: `app/api/insertOne/route.ts:27-85`
- Search with `ownerId` filter: `app/api/find/route.ts:16-78`, `app/api/findOne/route.ts:16-85`, `app/api/[db]/[collection]/route.ts:40-144`
- Update/Delete with `ownerId`: `app/api/updateOne/route.ts:6-67`, `app/api/deleteOne/route.ts:6-65`

## �🛄 **Creating Databases and Collections**

<div align="center">
  <img width="60" src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Card File Box.png" alt="🪄" />
</div>

To create a new **database** and **collection**, simply insert a document using the `/api/insertOne` endpoint. If the specified database or collection does not exist, it will be created automatically.

**Endpoint:**

```
POST http://localhost:4000/api/insertOne
```

**Request Body:**

```json
{
  "db": "yourDatabaseName",
  "collection": "yourCollectionName",
  "document": {
    "user": "John Smith",
    "age": 26,
    "email": "johnsmith@example.com"
  }
}
```

> **💡 Note:**  
> Replace `"yourDatabaseName"` and `"yourCollectionName"` with your desired names.  
> The database and collection will be created automatically if they do not exist.
> The `document` field can contain any information and fields you need—there are no limits.

---

## 📘 **API Endpoints**

<div align="center">
  <h3>🎯 Complete CRUD Operations Reference</h3>
</div>

### ✴️ **GET /api/:db/:collection**

**Retrieve all documents from a collection.**

| Parameter    | Type   | Description     |
| ------------ | ------ | --------------- |
| `db`         | string | Database name   |
| `collection` | string | Collection name |

**Example:**

```http
GET /api/myDatabase/users
Authorization: Bearer YOUR_AUTH_TOKEN
```

**Response:**

```json
{
  "success": true,
  "result": [
    { "_id": "...", "username": "juan", "email": "juan@email.com" },
    { "_id": "...", "username": "maria", "email": "maria@email.com" }
  ]
}
```

---

### 🔍 **POST /api/find**

**Query documents with custom filters.**

```json
{
  "db": "myDatabase",
  "collection": "users",
  "query": { "username": "juan" },
  "options": { "limit": 5 }
}
```

---

### 🔎 **POST /api/findOne**

**Find a single document.**

```json
{
  "db": "myDatabase",
  "collection": "users",
  "query": { "email": "a@a.com" }
}
```

---

### ➕ **POST /api/insertOne**

**Insert a new document.**

```json
{
  "db": "myDatabase",
  "collection": "users",
  "document": { "username": "lucas", "email": "lucas@mail.com" }
}
```

---

### 📝 **PUT /api/updateOne**

**Update an existing document.**

```json
{
  "db": "myDatabase",
  "collection": "users",
  "filter": { "username": "lucas" },
  "update": { "$set": { "email": "new@mail.com" } }
}
```

---

### ❌ **DELETE /api/deleteOne**

**Delete a document.**

```json
{
  "db": "myDatabase",
  "collection": "users",
  "filter": { "username": "lucas" }
}
```

---

## 🛡️ **Middleware Overview**

<div align="center">

| 🔧 **Middleware**             | 📝 **Description**                                                            |
| :---------------------------- | :---------------------------------------------------------------------------- |
| **`authToken.js`**            | Validates the token from the `Authorization` header against your `.env` value |
| **`validateMongoRequest.js`** | Ensures `db` and `collection` are present in the request                      |

</div>

---

## ✅ **Why Use This API?**

<div align="center">

🛡️ **Robust token-based security** • 🔧 **Flexible, reusable validation** • 🌐 **Clean, intuitive routes and JSON bodies** • 🚀 **Easily extendable for user authentication or role-based access**

</div>

---

## 📄 **License**

**MIT License (Non-Commercial)**

Copyright (c) 2025 Simple API MongoDB CRUD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction for **non-commercial purposes only**, including
without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

**COMMERCIAL USE RESTRICTION:**
The Software may NOT be sold, licensed for commercial use, or used in any
commercial product or service without explicit written permission from the
copyright holder.

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**For commercial licensing inquiries, please contact the project maintainer.**

---

<div align="center">

**Made with ❤️ by CodexSploitx**

_🚀 Simple, Fast, Secure MongoDB REST API_

</div>
