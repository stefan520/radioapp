# syntax=docker/dockerfile:1

FROM oven/bun:1 AS builder
WORKDIR /app

# Copy the entire project first so this also works before a lockfile exists.
COPY . .

# Install dependencies and build the PWA/frontend.
RUN bun install
RUN bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Only ship the built frontend and the tiny Bun static server.
COPY --from=builder /app/dist ./dist
COPY docker/server.ts ./server.ts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r=await fetch('http://127.0.0.1:3000/health'); if(!r.ok) process.exit(1)"

CMD ["bun", "run", "server.ts"]
