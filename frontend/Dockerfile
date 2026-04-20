# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Hanya salin standalone app dan public assets (sangat ringan)
COPY --from=builder /app/public ./public
# Standalone mode dari nextjs sudah mencakup node_modules minimal yang dibutuhkan
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
# Jalankan server bawaan hasil standalone
CMD ["node", "server.js"]
