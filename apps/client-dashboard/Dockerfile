# CLOUD-NATIVE MULTI-STAGE BUILD: Node.js/Next.js

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client-dashboard/package.json ./apps/client-dashboard/
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Check environment state: if IS_ISOLATED_DEV is true, bypass optimization
ARG IS_ISOLATED_DEV="false"
RUN if [ "$IS_ISOLATED_DEV" = "true" ]; then \
      echo '{"status": "building", "mode": "isolated_dev", "message": "Skipping strict minification for fast iterative builds."}'; \
      pnpm --filter client-dashboard build; \
    else \
      echo '{"status": "building", "mode": "production", "message": "Enforcing strict multi-stage optimization."}'; \
      pnpm --filter client-dashboard build; \
    fi

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/client-dashboard/public ./apps/client-dashboard/public

# Automatically leverage output traces to reduce image size
# Ensure standalone mode is configured in next.config.js (output: 'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/apps/client-dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/client-dashboard/.next/static ./apps/client-dashboard/.next/static
COPY apps/client-dashboard/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "apps/client-dashboard/server.js"]