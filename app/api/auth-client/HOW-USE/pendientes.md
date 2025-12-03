# Pendientes de Mejora (Auth-Client)

## Urgente (indispensable ahora)
- Endurecer secretos: exigir `JWT_AUTH_CLIENT` y `STMP_ENCRYPTION_KEY` sin valores por defecto.
- Unificar secretos admin: usar `JWT_AUTH_CLIENT_ADMIN` de forma consistente para login y verificación.
- Magic link robusto: token con `crypto.randomBytes(32)` + `jti` y expiración firme; sanitización HTML al enviar.
- OTP seguro: guardar `hash(code)` (HMAC-SHA256) y crear índice TTL sobre `expiresAt` en `STMP_OTP`.
- Rotación de refresh: en `/api/auth-client/refresh` emitir nuevo `refreshToken`, setear cookie y preparar detección de reuse.
- CSRF: proteger endpoints que usan cookies (`refresh`, cambio email/contraseña, acciones críticas) con double-submit u Origin-check.

## Alta prioridad
- Aislar Admin: mover `requireAuthClientAdmin` a `AUTH_CLIENT_DB` con rol propio, sin leer `permissions.*` del sistema principal.
- JWT claims: añadir `aud`, `iss`, `sub`, `jti` y validar algoritmo HS256 explícito.
- Password hashing: subir costo bcrypt a 12 o migrar a Argon2 si es viable.
- Sanitización consistente: aplicar sanitización HTML en todos los envíos (incl. magic link) y centralizar en utilitario.
- Placeholders de plantillas: validar y permitir solo `{{ .EmailUSer }}`, `{{ .UserName }}`, `{{ .CodeConfirmation }}`, `{{ .SiteURL }}`, `{{ ._id }}`; evitar `{{ .permissions.* }}` y `{{ .Token }}` salvo eventos que lo requieran.
- Índices únicos: `users.email` y `users.username` con unique index; validar colisiones.
- Bloqueo de login si `suspended === true` y mensajes uniformes de error.
- Rate limit persistente: almacenar contadores por IP/usuario en DB/Redis para resiliencia y evitar bypass en multi-instancia.

## Media prioridad
- Outbox worker: procesar `STMP_OUTBOX` con un job/worker que respete `minIntervalSeconds`, reintentos y backoff.
- Reuse de refresh: detectar y anular sesiones si se reutiliza un refresh antiguo (token theft mitigation).
- Reauth token: hacer `REAUTH_TOKEN_EXPIRES_IN` configurable, incluir `aud/iss/jti` y verificar acción (`action`) con mayor rigor.
- Seguridad de cabeceras: añadir `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` adecuada para emails y endpoints.
- Validaciones Zod: endurecer tamaños máximos y formatos donde falten; mensajes consistentes.
- Control de intentos OTP: `otpCooldownSeconds`, `otpMaxPerHour`, y política de una OTP activa por evento.
- Auditoría: registrar eventos claves (login, reset, reauth, magic link, cambio email) con metadatos mínimos no sensibles.
- Políticas de contraseñas: comprobar contraseñas comprometidas (p.ej. Pwned Passwords) opcional.

## Baja prioridad
- Observabilidad: métricas y logs estructurados; trazabilidad de request-id.
- Pruebas: unitarias y e2e para login/refresh/OTP/magic link/cambio email/reauth.
- Rendimiento: índices TTL y limpieza periódica de colecciones `otp`, `magiclinks`, `outbox`, `changeemail`.
- UX y i18n: mensajes de error consistentes, soporte multilenguaje.
- Documentación de entorno: especificar todas las variables requeridas y sus valores seguros.
- Gestión de secretos: rotación periódica y almacenamiento en vault.
- Protección anti-bots: opcional, añadir CAPTCHA en flujos de registro/login/OTP si el riesgo lo amerita.

## Notas de Implementación
- Config al arranque: validar obligatoriamente presencia de secretos y orígenes CORS; fallar “fast” si faltan.
- Consistencia de cookies: `HttpOnly`, `SameSite=Strict`, `Secure` en producción, y scopes de ruta controlados.
- Unificación de estados y códigos: usar `401/403/404/429/410` coherentemente; evitar fugas de información.

## Referencias de Código (guía de dónde tocar)
- Secretos JWT: `lib/auth.ts:7`, `lib/auth.ts:92`, `app/api/auth-client/admin/login/route.ts:6`.
- Magic link: `app/api/auth-client/magic-link/send/route.ts:58-83`, `consume/route.ts:37-58`.
- OTP: `app/api/stmp/templates/route.ts`, `app/api/auth-client/reset-password/request/route.ts:44-49`, `reauth/request/route.ts:45-50`, `change-email/start/route.ts:67-72`, `request-new/route.ts:48-53`.
- Refresh: `app/api/auth-client/refresh/route.ts:58-64`.
- Admin aislamiento: `lib/auth.ts:102-115`, `app/api/auth-client/admin/login/route.ts`.
