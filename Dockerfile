

# Stage 1: builder 
FROM node:20-slim AS builder

# openssl 
RUN apt-get update -qq && apt-get install -y -qq openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1)IGNES-Shared
COPY IGNES-Shared/ ./IGNES-Shared/
WORKDIR /app/IGNES-Shared
RUN npm ci && npm run build

# 2)Core
WORKDIR /app
COPY IGNES-Core/ ./IGNES-Core/
WORKDIR /app/IGNES-Core
RUN npm ci
RUN npx prisma generate
RUN npm run build

# rm devDependencies 
RUN npm prune --omit=dev

# Stage 2: runner 
FROM node:20-slim AS runner
RUN apt-get update -qq && apt-get install -y -qq \
    openssl \
    wireguard-tools \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/IGNES-Shared/ /app/IGNES-Shared/
COPY --from=builder /app/IGNES-Core/ /app/IGNES-Core/

WORKDIR /app/IGNES-Core

EXPOSE 3000
CMD ["node", "dist/server.js"]

