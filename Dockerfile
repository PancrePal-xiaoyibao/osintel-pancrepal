# Multi-stage Dockerfile for Pancreatic Cancer OSINT Hub (T5).
#
# Build stage compiles the Vite bundle + esbuild server bundle.
# Runtime stage is a small node:24-alpine with only dist/ + production deps.
# `node:sqlite` (built into Node 24) is used for persistence — no native compile.
#
# Run:    docker build -t osintel-pancrepal .
# Serve:  docker run --rm -p 3000:3000 -e JWT_SECRET=... -v $(pwd)/data:/app/data osintel-pancrepal

# ---------- build stage ----------
FROM node:24-alpine AS build
WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies for the runtime image
RUN npm prune --omit=dev

# ---------- runtime stage ----------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
# Disable Node experimental SQLite warning noise on stderr at boot
ENV NODE_NO_WARNINGS=1

# Install only the production node_modules from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Non-root user
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data \
    && chown -R app:app /app
USER app

EXPOSE 3000

# HEALTHCHECK polls /healthz every 30s; 3 consecutive failures => unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.cjs"]
