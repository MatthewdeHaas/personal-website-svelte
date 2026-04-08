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
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/db ./db
COPY --from=builder /app/build ./build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build"]
