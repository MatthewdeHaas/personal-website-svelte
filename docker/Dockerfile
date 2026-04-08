# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Copy db package.json so we can install its dependencies too
COPY db/package*.json ./db/
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# 1. Copy the root package files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# 2. Copy the build output
COPY --from=builder /app/build ./build

# 3. Copy the DB folder (needed for migrations and sync)
COPY --from=builder /app/db ./db

# 4. Install production dependencies for BOTH root and db
# We install tsx here so it's available for the scripts
RUN npm ci --omit=dev && cd db && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build"]
