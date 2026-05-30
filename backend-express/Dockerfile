# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm (matching major version used locally)
RUN npm install -g pnpm@10

# Copy manifests first — Docker caches this layer until they change
COPY package.json pnpm-lock.yaml ./

# Install ALL deps (devDeps needed for TypeScript compilation)
RUN pnpm install --frozen-lockfile

# Copy source (tests and dev-only configs are excluded via .dockerignore)
COPY . .

# Compile TypeScript → dist/
RUN pnpm build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@10

# Copy manifests and install ONLY production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Never run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

ENV NODE_ENV=production

# Health check — hits the /health endpoint we already have
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
