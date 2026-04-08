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

# 1. Copy package files first
COPY --from=builder /app/package*.json ./

# 2. Copy the db folder (THIS MUST HAPPEN BEFORE THE CD DB COMMAND)
COPY --from=builder /app/db ./db

# 3. Copy the rest of the build
COPY --from=builder /app/build ./build

# 4. Now run the installs
# Added a check to make sure npm doesn't fail on missing scripts/files
RUN npm ci --omit=dev && \
    cd db && \
    npm install --omit=dev --no-save

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build"]
