# Multi-stage Dockerfile for Next.js app using Node 18 and npm
FROM node:18.18-bullseye-slim AS builder

WORKDIR /app

# Install dependencies with npm using lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:18.18-bullseye-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets and public files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port and start Next.js
EXPOSE 3000
CMD ["npm", "run", "start"]