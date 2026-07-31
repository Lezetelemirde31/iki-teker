# Build and run the app as one self-contained image.
#
# Three stages so the shipped image carries neither the source nor the build
# toolchain: deps installs, builder compiles, runner holds only the standalone
# output. That is a few hundred megabytes rather than a few gigabytes, which
# matters every time the server pulls a new version.

# ---- dependencies ----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Copied on their own so a change to application code does not invalidate the
# dependency layer — the slowest step is then also the most often cached.
COPY package.json package-lock.json ./
RUN npm ci

# ---- build -----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The build runs without a database. Every page that reads data is dynamic, and
# the ones that are prerendered read the static reference data only.
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# A compromised process should not be root inside the container.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations and the scripts that apply them travel with the image, so a deploy
# and its schema change are always the same version.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db

USER nextjs
EXPOSE 3000

# Compose watches this; an unhealthy container is restarted rather than left
# accepting traffic it cannot serve.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
