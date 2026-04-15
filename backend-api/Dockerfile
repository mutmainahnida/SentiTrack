FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target es2020 --esModuleInterop --skipLibCheck
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh
RUN chmod +x node_modules/.bin/prisma

EXPOSE 5000
ENTRYPOINT ["./docker-entrypoint.sh"]
