# API rápida de MongoDB en Next.js + TypeScript

## 📝 Descripción

Una **API modular y segura** para MongoDB, construida con **Next.js**, diseñada para realizar operaciones CRUD en cualquier base de datos y colección MongoDB. Ideal para prototipos rápidos, pruebas y proyectos pequeños a medianos.

---

## 🚀 Características

- **Conexiones dinámicas**: Conéctate instantáneamente a cualquier base de datos y colección MongoDB.
- **Soporte completo CRUD**: Endpoints para `find`, `findOne`, `insertOne`, `updateOne`, `deleteOne`.
- **Autenticación con token**: Protege tus endpoints con un token simple (JWT o API_KEY).
- **Estructura modular**: Organiza tu código en carpetas como `app/api`, `services`, `middleware`, `lib`, `types`, `utils`.
- **Validaciones opcionales**: Usa librerías como Zod para validar los datos de entrada.
- **Desarrollo rápido**: Perfecto para setups rápidos y proyectos pequeños a medianos.

---

## 🚀 Endpoints Principales

1. **Endpoints CRUD simples**

   - `/api/find` → Obtener todos los documentos de una colección
   - `/api/findOne` → Obtener un documento específico por ID
   - `/api/insertOne` → Insertar un nuevo documento
   - `/api/updateOne` → Actualizar un documento existente
   - `/api/deleteOne` → Eliminar un documento por ID

2. **Middleware de autenticación**

   - Protege los endpoints con un **token simple (JWT o API_KEY)**
   - Middleware global o aplicado solo a `/api/*`

3. **Conexión eficiente a MongoDB**

   - **Singleton** para no abrir múltiples conexiones
   - Fácil de cambiar de base de datos o colección

4. **Servicios reutilizables**

   - Lógica CRUD centralizada en `services/crudService.ts`
   - Endpoints muy limpios, solo manejan request/response

5. **Validaciones opcionales**

   - Uso de **Zod** u otra librería de validación para requests
   - Evita errores y asegura consistencia en la DB

6. **Estructura modular y escalable**
   - Carpetas separadas: `app/api` para endpoints, `services` para lógica, `middleware` para auth, `lib` para DB
   - Fácil de agregar nuevos recursos como `users`, `products`, etc.

---

## 🛠 Stack tecnológico

- **Next.js** → Framework fullstack ligero, con API Routes y soporte TypeScript
- **TypeScript** → Tipado fuerte para evitar errores y mejorar mantenimiento
- **MongoDB** → Base de datos NoSQL flexible
- **pnpm** → Gestión de paquetes rápida y ligera
- **Zod (opcional)** → Validación de datos recibidos

---

## 🎯 Propósito final

- Tener un **entorno de pruebas rápido** para CRUD y tests sobre MongoDB
- Posibilidad de **prototipar features** sin montar un backend complejo
- Escalabilidad futura para agregar autenticación más avanzada, recursos adicionales o integración con frontend

---

## 📂 Estructura del proyecto

├── app
│ └── api
│ ├── find/route.ts # GET varios
│ ├── findOne/route.ts # GET uno
│ ├── insertOne/route.ts # POST
│ ├── updateOne/route.ts # PUT
│ └── deleteOne/route.ts # DELETE
├── middleware
│ └── authToken.ts # Middleware global o específico
├── lib
│ └── mongo.ts # Conexión singleton a MongoDB
├── services
│ └── crudService.ts # Funciones CRUD reutilizables
├── types
│ └── mongo.d.ts # Interfaces y tipos de documentos
├── utils
│ └── validateRequest.ts # Validaciones de requests
├── env.local
└── next.config.js

---

## ⚙️ Variables de entorno (`.env.local`)

```env
MONGODB_URI=mongodb://localhost:27017
AUTH_TOKEN=your_secret_token # Generate at https://it-tools.tech/token-generator
PORT=4000
```
