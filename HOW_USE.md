# 🧩 MongoDB REST API

# API rápida de MongoDB en Next.js + TypeScript

## 📝 Descripción

A **Modular and Secure** API for MongoDB, built with **Next.js**, designed to perform CRUD operations on any MongoDB database and collection. Ideal for rapid prototyping, testing, and small to medium-sized projects.

---

## 🚀 Features

- **Dynamic Connections**: Instantly connect to any MongoDB database and collection.
- **Full CRUD Support**: Endpoints for `find`, `findOne`, `insertOne`, `updateOne`, `deleteOne`.
- **Token Authentication**: Protect your endpoints with a simple token (JWT or API_KEY).
- **Modular Structure**: Organize your code in folders like `app/api`, `services`, `middleware`, `lib`, `types`, `utils`.
- **Optional Validations**: Use libraries like Zod to validate input data.
- **Rapid Development**: Perfect for quick setups and small to medium-sized projects.

---

## 📦 **Installation**

```bash
git clone https://github.com/CodexSploitx/simple-mongo-rest-api.git
cd simple-mongo-rest-api
pnpm install  # or npm install
```

Create a `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017
AUTH_TOKEN=your_secret_token # Generate at https://it-tools.tech/token-generator
PORT=4000
```

---

## ▶️ **Getting Started**

```bash
pnpm start  # or npm run start

# To test MongoDB connection:
pnpm test
```

Server runs at: [http://localhost:3000](http://localhost:3000)

---

## 🔐 **Authentication**

All endpoints require:

```
Authorization: Bearer your_secret_token
```

If missing or invalid, a `401 Unauthorized` is returned.

---

## 🛄 **Creating Databases and Collections**

To create a new **database** and **collection**, simply insert a document using the `/api/insertOne` endpoint. If the specified database or collection does not exist, it will be created automatically.

**Endpoint:**

```
POST http://localhost:4000/api/insertOne
```

**Request Body:**

```json
{
  "db": "yourDatabaseName", // Name of the database to create/use
  "collection": "yourCollectionName", // Name of the collection to create/use
  "document": {
    "user": "John Smith",
    "age": 26,
    "email": "johnsmith@example.com"
  }
}
```

> **Note:**  
> Replace `"yourDatabaseName"` and `"yourCollectionName"` with your desired names.  
> The database and collection will be created automatically if they do not exist.
> The `document` field can contain any information and fields you need—there are no limits.

Once you send the request, the database and collection will be created, and your document will be inserted.

---

## 📘 **API Endpoints**

### ✴️ **GET /api/:db/:collection**

Retrieve all documents from a collection.

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

Query documents with custom filters.

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

Find a single document.

```json
{
  "db": "myDatabase",
  "collection": "users",
  "query": { "email": "a@a.com" }
}
```

---

### ➕ **POST /api/insertOne**

Insert a new document.

```json
{
  "db": "myDatabase",
  "collection": "users",
  "document": { "username": "lucas", "email": "lucas@mail.com" }
}
```

---

### 📝 **PUT /api/updateOne**

Update an existing document.

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

Delete a document.

```json
{
  "db": "myDatabase",
  "collection": "users",
  "filter": { "username": "lucas" }
}
```

---

## 🛡️ **Middleware Overview**

- **`authToken.js`**  
  Validates the token from the `Authorization` header against your `.env` value.

- **`validateMongoRequest.js`**  
  Ensures `db` and `collection` are present in the request.

---

## 📂 **Project Structure**

```
.
├── app/
│   ├── api/
│   │   ├── [db]/
│   │   │   └── [collection]/
│   │   │       └── route.ts      # GET dinámico por db y collection
│   │   ├── find/
│   │   │   └── route.ts          # GET varios documentos
│   │   ├── findOne/
│   │   │   └── route.ts          # GET un documento
│   │   ├── insertOne/
│   │   │   └── route.ts          # POST crear documento
│   │   ├── updateOne/
│   │   │   └── route.ts          # PUT actualizar documento
│   │   └── deleteOne/
│   │       └── route.ts          # DELETE eliminar documento
│   ├── globals.css
│   ├── layout.tsx                # Layout principal de Next.js
│   └── page.tsx                  # Página principal
├── lib/
│   ├── httpMethodValidator.ts    # Validador de métodos HTTP
│   ├── mongo.ts                  # Conexión singleton a MongoDB
│   └── requestValidation.ts      # Validaciones de requests y JSON
├── middleware/
│   └── authToken.ts              # Middleware de autenticación por token
├── services/
│   └── crudService.ts            # Funciones CRUD reutilizables
├── types/
│   └── mongo.d.ts                # Interfaces y tipos de MongoDB
├── public
├── .gitignore
├── .env.local                    # Variables de entorno (no incluido en git)
├── eslint.config.mjs
├── next.config.ts                # Configuración de Next.js
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

- Robust token-based security
- Flexible, reusable validation
- Clean, intuitive routes and JSON bodies
- Easily extendable for user authentication or role-based access

---

## 📄 **License**

MIT License (Non-Commercial)

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
