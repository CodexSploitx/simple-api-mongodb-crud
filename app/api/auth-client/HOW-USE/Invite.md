# Evento "Invite user"

Guía para que los desarrolladores integren el envío de invitaciones de registro a nuevos usuarios desde Auth-Client.

## Qué es
- Permite que un usuario autenticado envíe un correo de invitación a otra persona para registrarse.
- El correo se renderiza con una plantilla del evento `invite_user` y soporta variables opcionales para promos/recompensas.

## Requisitos previos
- Debes estar autenticado con Auth-Client para poder enviar invitaciones.
- Debe existir una plantilla activa para el evento `invite_user` en el editor de templates.
  - Editor y placeholders del evento: `app/auth-client/components/Templates/TemplatesModal.tsx:122-141`.

## Configuración
- Administrable vía `GET/POST /api/stmp/settings`.
- Campos relevantes:
  - `inviteTokenTtlHours`: horas de vida del token de invitación (TTL).
  - `inviteCooldownSeconds` y `inviteMaxPerHour`: valores disponibles para control de ritmo; el endpoint actualmente usa `inviteTokenTtlHours` para calcular expiración del token.
- Implementación de settings: `app/api/stmp/settings/route.ts:6-14`, `app/api/stmp/settings/route.ts:16-32`, `app/api/stmp/settings/route.ts:34-75`.

## Placeholders soportados
Solo disponibles en plantillas del evento `invite_user`:
- `{{ .EmailUSer }}`: email del invitado.
- `{{ .UserName }}`: nombre a mostrar del invitado (se deriva del email si no existe nombre real).
- `{{ .Token }}`: token de invitación generado y almacenado.
- `{{ .SiteURL }}`: URL base del sitio/API.
- Opcionales según lo que envíe el cliente:
  - `{{ .PromoCode }}`
  - `{{ .RewardTitle }}`
  - `{{ .RewardText }}`

En UI, estos placeholders se muestran únicamente cuando `eventKey === "invite_user"`. Referencia: `app/auth-client/components/Templates/TemplatesModal.tsx:132-141`, `app/auth-client/components/Templates/TemplatesModal.tsx:143-156`.

## Endpoint de envío
`POST /api/auth-client/invitations/send`

- Autenticación: requerida (solo usuarios logueados).
- Body JSON:
  ```json
  {
    "email": "invitee@example.com",
    "promoCode": "WELCOME10",
    "rewardTitle": "Welcome Bonus",
    "rewardText": "Get 10% off on your first purchase."
  }
  ```
- Respuesta:
  - `200 OK { "success": true, "token": "<INVITE_TOKEN>" }`
  - Errores comunes: `400 { error: "Invalid email" }`, `404 { error: "No active template" }`, `400 { error: "Event not active" }`.

Implementación: `app/api/auth-client/invitations/send/route.ts:10-13`, `app/api/auth-client/invitations/send/route.ts:17-26`, `app/api/auth-client/invitations/send/route.ts:27-39`.

## Flujo de procesamiento
1. Validación y autenticación del solicitante.
2. Lectura de configuración STMP y verificación de que el evento `invite_user` esté activo.
3. Selección de plantilla activa para `invite_user`.
4. Generación de token y persistencia en colección de invitaciones con `expiresAt`.
5. Render de placeholders y encolado en `outbox` para envío SMTP.
6. Intento de envío inmediato; si falla, el correo queda encolado.

Referencias clave:
- Generación y persistencia de token: `app/api/auth-client/invitations/send/route.ts:41-47`.
- Reemplazo de placeholders: `app/api/auth-client/invitations/send/route.ts:50-59`.
- Encolado y envío: `app/api/auth-client/invitations/send/route.ts:64-72`.

## Persistencia y seguridad
- Invitaciones se guardan en la colección `STMP_INVITES` (por defecto `invites`) dentro del `db` de STMP. Referencia: `app/api/auth-client/invitations/send/route.ts:41-47`.
- TTL del token: definido por `inviteTokenTtlHours` y usado para calcular `expiresAt`. Referencia: `app/api/auth-client/invitations/send/route.ts:43-45`.
- Solo usuarios autenticados pueden crear invitaciones. Referencia: `app/api/auth-client/invitations/send/route.ts:11-13`.
- Sanitización básica del HTML de correo se realiza en el proceso de envío; además, el editor aplica sanitización para `preview`.

## Cómo construir el enlace de invitación
- Usa `{{ .Token }}` dentro de tu template para incrustar el token en un enlace, por ejemplo:
  ```html
  <a href="{{ .SiteURL }}/register?invite={{ .Token }}">Regístrate ahora</a>
  ```
- La app que recibe el enlace debe leer `invite` del querystring y aplicarlo a su flujo de registro.

## Ejemplo cURL
```bash
curl -X POST "http://localhost:3000/api/auth-client/invitations/send" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
        "email":"invitee@example.com",
        "promoCode":"WELCOME10",
        "rewardTitle":"Welcome Bonus",
        "rewardText":"Get 10% off on your first purchase."
      }'
```

## Buenas prácticas
- No incluyas datos sensibles en el HTML de la invitación.
- Activa solo una plantilla por evento para evitar confusión.
- Ajusta `inviteTokenTtlHours` según la caducidad deseada del enlace.
- Mantén controlados los valores de `inviteCooldownSeconds` y `inviteMaxPerHour` si integras limitadores de ritmo.
