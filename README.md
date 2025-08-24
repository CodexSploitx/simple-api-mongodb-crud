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

---

## 📦 **Installation**

```bash
git clone https://github.com/CodexSploitx/simple-api-mongodb-crud.git
cd simple-api-mongodb-crud
pnpm install  # or npm install
```

**🔧 Environment Setup:**

Create a `.env` file:

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

## 🛄 **Creating Databases and Collections**

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

## 📂 **Project Structure**

```
.
├── app/
│   ├── api/
│   │   ├── [db]/
│   │   │   └── [collection]/
│   │   │       └── route.ts      # Dynamic GET by db and collection
│   │   ├── find/
│   │   │   └── route.ts          # GET multiple documents
│   │   ├── findOne/
│   │   │   └── route.ts          # GET single document
│   │   ├── insertOne/
│   │   │   └── route.ts          # POST create document
│   │   ├── updateOne/
│   │   │   └── route.ts          # PUT update document
│   │   └── deleteOne/
│   │       └── route.ts          # DELETE remove document
│   ├── globals.css
│   ├── layout.tsx                # Main Next.js layout
│   └── page.tsx                  # Main page
├── lib/
│   ├── httpMethodValidator.ts    # HTTP method validator
│   ├── mongo.ts                  # MongoDB singleton connection
│   └── requestValidation.ts      # Request and JSON validations
├── middleware/
│   └── authToken.ts              # Token authentication middleware
├── services/
│   └── crudService.ts            # Reusable CRUD functions
├── types/
│   └── mongo.d.ts                # MongoDB interfaces and types
├── public
├── .gitignore
├── .env.local                    # Environment variables (not included in git)
├── eslint.config.mjs
├── next.config.ts                # Next.js configuration
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
├── HOW_USE.md
└── README.md
```

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
