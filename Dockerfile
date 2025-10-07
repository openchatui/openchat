# Multi-stage Dockerfile for Next.js + Prisma (SQLite)

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
# Install dependencies (use lockfile if present)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
# Generate Prisma Client early so it is cached with node_modules
ENV DB=sqlite
ENV SQLITE_URL=file:./prisma/dev.db
RUN pnpm exec prisma generate --schema prisma/schema.sqlite.prisma

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build Next.js
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Default environment variables (can be overridden at runtime)
ENV DB=sqlite
ENV SQLITE_URL=file:/prisma/dev.db
ENV AUTH_TRUST_HOST=true
ENV NEXTAUTH_URL=http://localhost:3000

# Copy runtime assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next

# Install OpenSSL (required by Prisma and for generating secrets)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/* \
  && pnpm run prisma:gen

EXPOSE 3000

# Generate NEXTAUTH_SECRET if not provided, run migrations, and start the app
CMD sh -c 'export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}"; \
  echo "Starting OpenChat..."; \
  [ -z "$NEXTAUTH_SECRET_PROVIDED" ] && echo "⚠️  NEXTAUTH_SECRET generated (set it for persistence across restarts)"; \
  pnpm run migrate:deploy || pnpm run db:push; \
  pnpm start'


