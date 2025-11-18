# Dockerfile optimizado para Next.js 15 (standalone) y Dokploy

# Etapa de dependencias
FROM node:18.18-bullseye-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Etapa de build
FROM node:18.18-bullseye-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Args opcionales para variables públicas en build (si las usas)
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

# Etapa de producción (standalone)
FROM node:18.18-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Usa usuario no root para mayor seguridad
USER node

# Copia salida standalone y estáticos
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Healthcheck sin instalar curl/wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "const http=require('http'); const req=http.get(`http://localhost:${process.env.PORT}`,(res)=>{process.exit(res.statusCode===200?0:1);}); req.on('error',()=>process.exit(1));"

# Inicia el servidor Next.js standalone
CMD ["node", "server.js"]