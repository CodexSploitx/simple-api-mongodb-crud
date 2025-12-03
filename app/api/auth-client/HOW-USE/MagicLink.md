# Magic Link: Inicio de sesión con enlace de un solo uso

Guía para que los desarrolladores integren el evento `magic_link` y permitan a los usuarios iniciar sesión solo con su email, sin contraseña.

## Qué es
- Envía un enlace de un solo uso al email del usuario.
- Al consumir ese enlace, se genera `accessToken` y se establece `refreshToken` en cookie HTTP-only.

## Requisitos previos
- El usuario debe existir en `AUTH_CLIENT_DB`.`AUTH_CLIENT_COLLECTION`.
- Debe estar activo el evento `magic_link` en la configuración STMP (toggle obligatorio). Si está desactivado, el endpoint de envío responde `400 { "error": "Magic link deactivated: event not active" }`.
- Debe existir una plantilla activa para `magic_link` (se puede autogenerar la default).

## Activar evento y plantilla default
- Endpoint: `POST /api/stmp/events`
- Body: `{ "eventKey": "magic_link", "active": true }`
- Si no existe una plantilla activa, se crea la default automáticamente.
- Implementación: `app/api/stmp/events/route.ts:22-59` y default: `app/api/stmp/events/route.ts:112-121`.

## Placeholders soportados (solo `magic_link`)
- `{{ .EmailUSer }}`: email del usuario.
- `{{ .UserName }}`: nombre a mostrar (derivado del email si no hay username).
- `{{ .Token }}`: token del enlace mágico.
- `{{ .SiteURL }}`: URL base del sitio/API.
- `{{ ._id }}`: ID del usuario.
- En el editor de templates, aparecen únicamente para `magic_link`: `app/auth-client/components/Templates/TemplatesModal.tsx:122-141`, `app/auth-client/components/Templates/TemplatesModal.tsx:143-148`.

## Enviar el enlace
- Endpoint: `POST /api/auth-client/magic-link/send`
- Body:
```json
{ "email": "user@example.com" }
```
- Respuestas:
- `200 OK { "success": true, "token": "<MAGIC_TOKEN>" }`
- `400 { error: "Invalid email" }`, `404 { error: "User not found" }`, `400 { error: "Magic link deactivated: event not active" }`
- Implementación: `app/api/auth-client/magic-link/send/route.ts:9-25`, `app/api/auth-client/magic-link/send/route.ts:27-39`, `app/api/auth-client/magic-link/send/route.ts:41-47`, `app/api/auth-client/magic-link/send/route.ts:60-72`.

## Consumir el enlace (iniciar sesión)
- GET: `GET /api/auth-client/magic-link/consume?token=<MAGIC_TOKEN>`
- POST: `POST /api/auth-client/magic-link/consume` con body `{ "token": "<MAGIC_TOKEN>" }`
- Respuesta exitosa:
```json
{ "success": true, "accessToken": "...", "user": { "id": "...", "email": "...", "username": "..." } }
```
- Efectos:
- Marca el token como usado.
- Establece cookie `refreshToken` HTTP-only, `SameSite=strict` y `Max-Age=7 días`.
- Marca `verifiEmail: true` para el usuario (si no lo estaba).
- Implementación: `app/api/auth-client/magic-link/consume/route.ts:61-70`, `app/api/auth-client/magic-link/consume/route.ts:72-86`, flujo interno: `app/api/auth-client/magic-link/consume/route.ts:16-59`.

## Plantilla default de Magic Link
- Subject: "Your magic link".
- HTML genera un botón con `{{ .Token }}` y `{{ .SiteURL }}`.
- Generación automática al activar el evento: `app/api/stmp/events/route.ts:112-121`.

## Configuración de expiración (TTL)
- `magicLinkTtlMinutes`: minutos de validez del token de enlace mágico.
- Leído desde `stmpdb.config` si está presente; por defecto, 60 minutos.
- Usado en: `app/api/auth-client/magic-link/send/route.ts:41-47`.

## Ejemplos
- Activar evento y plantilla default:
```bash
curl -X POST "http://localhost:3000/api/stmp/events" \
  -H "Content-Type: application/json" \
  -d '{ "eventKey": "magic_link", "active": true }'
```
- Enviar magic link:
```bash
curl -X POST "http://localhost:3000/api/auth-client/magic-link/send" \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com" }'
```
- Consumir magic link (GET):
```bash
curl -X GET "http://localhost:3000/api/auth-client/magic-link/consume?token=<MAGIC_TOKEN>" \
  -H "Accept: application/json"
```
- Consumir magic link (POST):
```bash
curl -X POST "http://localhost:3000/api/auth-client/magic-link/consume" \
  -H "Content-Type: application/json" \
  -d '{ "token": "<MAGIC_TOKEN>" }'
```

## Buenas prácticas
- Mantén una sola plantilla activa por evento.
- No incluyas datos sensibles en el HTML.
- Define un TTL razonable para el token (`magicLinkTtlMinutes`).
- Implementa CORS restringido en producción.
