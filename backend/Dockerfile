# syntax=docker/dockerfile:1

# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY package.json ./
RUN pnpm install --ignore-scripts
RUN pnpm rebuild esbuild protobufjs @firebase/util

COPY . .
RUN npx tsc --build tsconfig.docker.json --force

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable pnpm

ENV NODE_ENV production
ENV PORT 5000

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

COPY package.json ./
RUN pnpm install --prod --ignore-scripts

COPY --from=builder --chown=backend:nodejs /app/dist ./dist

USER backend

EXPOSE 5000

CMD ["node", "dist/server.js"]
