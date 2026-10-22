
# ============================================================
# Stage 1: builder — устанавливаем ВСЕ зависимости и собираем
# ============================================================
FROM node:20-slim AS builder

# openssl нужен Prisma для native engine на Debian
RUN apt-get update -qq && apt-get install -y -qq openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Сначала — IGNES-Shared, потому что Core от него зависит через file:../
COPY IGNES-Shared/ ./IGNES-Shared/
WORKDIR /app/IGNES-Shared
RUN npm ci && npm run build

# 2) Теперь Core
WORKDIR /app
COPY IGNES-Core/ ./IGNES-Core/
WORKDIR /app/IGNES-Core
RUN npm ci
RUN npx prisma generate
RUN npm run build

# Убираем devDependencies — в runner они не нужны
RUN npm prune --omit=dev

# ============================================================
# Stage 2: runner — только то, что нужно для запуска
# ============================================================
FROM node:20-slim AS runner
RUN apt-get update -qq && apt-get install -y -qq \
    openssl \
    wireguard-tools \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Копируем обе папки целиком из builder.
# Это проще и надёжнее, чем хирургически вытаскивать dist + .prisma:
# file:..-зависимость требует, чтобы IGNES-Shared был рядом с Core.
COPY --from=builder /app/IGNES-Shared/ /app/IGNES-Shared/
COPY --from=builder /app/IGNES-Core/ /app/IGNES-Core/

WORKDIR /app/IGNES-Core

EXPOSE 3000
CMD ["node", "dist/server.js"]

