# Personal Website — Architecture

## Overview

A personal website built with SvelteKit and Node, containerized with Docker, deployed to a DigitalOcean droplet via automated CI/CD. The site has a newspaper aesthetic with three primary sections: a home/about page, a blog, and a gallery. Blog content lives in the repository as `.svx` files. Gallery metadata and view counts live in Postgres on block storage. Media assets (photos, videos) live in object storage (DigitalOcean Spaces or Cloudflare R2).

---

## Stack

| Layer | Technology |
|---|---|
| Frontend / Full-stack framework | SvelteKit (adapter-node) |
| Runtime | Node.js |
| Styling | Tailwind CSS |
| Markdown / Blog | mdsvex |
| Math rendering (future) | remark-math + rehype-katex |
| Database | Postgres (gallery metadata + view counts only) |
| Object storage | DigitalOcean Spaces or Cloudflare R2 |
| Reverse proxy / TLS | Caddy |
| Containerization | Docker + Docker Compose |
| Container registry | GitHub Container Registry (GHCR) |
| Hosting | DigitalOcean Droplet + Block Storage volume |
| CI/CD | GitHub Actions |
| Provisioning | TypeScript provisioning script (DigitalOcean API) |

---

## Repository Structure

```
personal-site/
├── src/
│   ├── posts/                  # Blog posts as .svx files
│   │   └── on-running.svx
│   ├── lib/
│   │   ├── components/         # Shared Svelte components
│   │   │   ├── Callout.svelte
│   │   │   ├── GalleryGrid.svelte
│   │   │   └── VideoPlayer.svelte
│   │   ├── server/
│   │   │   ├── db.ts           # Postgres client (postgres.js)
│   │   │   └── gallery.ts      # Gallery queries
│   │   └── types.ts
│   └── routes/
│       ├── +layout.svelte      # Newspaper chrome (masthead, nav, footer)
│       ├── +page.svelte        # Home / about
│       ├── blog/
│       │   ├── +page.server.ts # Glob import all .svx posts
│       │   ├── +page.svelte    # Posts index
│       │   └── [slug]/
│       │       ├── +page.ts    # Dynamic import single post
│       │       └── +page.svelte
│       ├── gallery/
│       │   ├── +page.server.ts # Fetch albums + assets from Postgres
│       │   ├── +page.svelte    # Gallery home
│       │   └── [album]/
│       │       ├── +page.server.ts
│       │       └── +page.svelte
│       └── api/
│           └── views/
│               └── [id]/
│                   └── +server.ts  # POST to increment view count
├── infra/
│   ├── provision.ts            # Droplet + volume + DNS provisioning script
│   ├── teardown.ts
│   └── docker-compose.prod.yml
├── docker/
│   ├── Dockerfile              # Multi-stage: build -> node runtime
│   └── Caddyfile
├── docker-compose.yml          # Dev: app + postgres
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR checks
│       └── deploy.yml          # Main branch deploy
├── mdsvex.config.js
├── svelte.config.js
└── vite.config.ts
```

---

## Routing

| Route | Description |
|---|---|
| `/` | Home / about |
| `/blog` | Posts index, sorted by date, derived from frontmatter |
| `/blog/[slug]` | Individual post rendered from `.svx` |
| `/gallery` | Gallery home, albums listed |
| `/gallery/[album]` | Album view with photos and videos |
| `/api/views/[id]` | POST endpoint — increments video view count in Postgres |

---

## Blog Pipeline

Posts are `.svx` files in `src/posts/`. They are glob-imported at build time — no database involved.

**Frontmatter schema:**
```yaml
---
title: On Running in the Rain
date: 2025-11-14
tags: [running, pacific spirit]
description: A short description for the index card.
---
```

**Posts index (`/blog/+page.server.ts`):**
```ts
const modules = import.meta.glob('/src/posts/*.svx', { eager: true });

export const load = () => {
  const posts = Object.entries(modules).map(([path, mod]) => ({
    slug: path.split('/').at(-1).replace('.svx', ''),
    ...(mod as any).metadata,
  }));

  return { posts: posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)) };
};
```

**Individual post (`/blog/[slug]/+page.ts`):**
```ts
export const load = async ({ params }) => {
  const post = await import(`../../../posts/${params.slug}.svx`);
  return { content: post.default, meta: post.metadata };
};
```

**mdsvex config (`mdsvex.config.js`):**
```js
export default {
  extensions: ['.svx'],
  highlight: { /* shiki or highlight.js */ },
  // remark-math + rehype-katex added here when LaTeX support is needed
};
```

Publishing a post = drop a `.svx` file in `src/posts/` and push to main. The deploy pipeline handles the rest.

---

## Gallery

The gallery is the only section backed by Postgres. Media files themselves live in object storage (Spaces or R2), referenced by URL.

**Postgres schema:**
```sql
CREATE TABLE albums (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assets (
  id          SERIAL PRIMARY KEY,
  album_id    INTEGER REFERENCES albums(id),
  type        TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  url         TEXT NOT NULL,        -- object storage URL
  caption     TEXT,
  position    INTEGER,              -- manual ordering within album
  view_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**View tracking:**
```ts
// /api/views/[id]/+server.ts
export const POST = async ({ params, locals }) => {
  await locals.db`
    UPDATE assets SET view_count = view_count + 1 WHERE id = ${params.id}
  `;
  return new Response(null, { status: 204 });
};
```

Called client-side once when a video begins playing. No auth required — this is a personal site, not a product.

---

## Docker

**Multi-stage Dockerfile:**
```dockerfile
# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "build"]
```

**Dev (`docker-compose.yml`):**
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes: ["./src:/app/src"]  # hot reload in dev
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/site
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: site
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes: ["pgdata:/var/lib/postgresql/data"]

volumes:
  pgdata:
```

**Prod (`infra/docker-compose.prod.yml`):**
```yaml
services:
  app:
    image: ghcr.io/<username>/personal-site:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OBJECT_STORAGE_URL=${OBJECT_STORAGE_URL}
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /mnt/block-storage/pgdata:/var/lib/postgresql/data  # block storage volume
    restart: unless-stopped

volumes:
  caddy_data:
```

**Caddyfile:**
```
yourdomain.com {
  reverse_proxy app:3000
}
```

Caddy handles HTTPS automatically via Let's Encrypt. No certbot, no manual renewal.

---

## Infrastructure Provisioning

`infra/provision.ts` — run once to stand up the droplet. Reuse the pattern from Gambit.

Steps performed:
1. Create DigitalOcean droplet (Ubuntu 24, appropriate size)
2. Attach block storage volume, mount at `/mnt/block-storage`
3. Configure DNS A record pointing domain to droplet IP
4. SSH in, install Docker + Docker Compose
5. Copy `docker-compose.prod.yml`, `.env`, `Caddyfile` to droplet
6. Pull image from GHCR and start services

`infra/teardown.ts` destroys the droplet and optionally the volume. The droplet is fully cattle — nothing lives on it that isn't in the repo or the database.

---

## CI/CD

### CI — Pull Requests (`.github/workflows/ci.yml`)

Runs on every PR targeting `main`.

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run check        # svelte-check + tsc
      - run: npm run lint         # eslint
      - run: npm run test         # vitest (if tests exist)
```

### Deploy — Main Branch (`.github/workflows/deploy.yml`)

Runs on push to `main` after CI passes.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:latest

      - name: Deploy to droplet
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | App (prod) | Postgres connection string |
| `OBJECT_STORAGE_URL` | App | Base URL for Spaces / R2 bucket |
| `OBJECT_STORAGE_KEY` | App | Access key for object storage |
| `OBJECT_STORAGE_SECRET` | App | Secret for object storage |
| `DROPLET_IP` | GitHub Actions | Droplet IP for SSH deploy step |
| `SSH_PRIVATE_KEY` | GitHub Actions | Private key for deploy SSH |

Dev values live in `.env` (gitignored). Prod values are GitHub Actions secrets and injected into the droplet's `.env` at provision time.

---

## Design — Newspaper Aesthetic

- **Layout:** Dense typographic grid. Column-based structure on wider viewports. Horizontal rules as section dividers.
- **Typography:** Strong serif for headings (e.g. Playfair Display, Lora, or similar), monospace or condensed sans for bylines and metadata, readable serif or neutral sans for body prose.
- **Color:** Black, off-white, and one ink accent (deep red, navy, or forest green). No gradients.
- **Blog index:** Rendered like a front page — headline, byline, date, short description. No card borders, no shadows.
- **Gallery:** Curated grid layout, not a dump. Albums as sections. Caption text in small-caps or italic.

---

## Future Considerations

| Item | Notes |
|---|---|
| LaTeX in blog | Add `remark-math` + `rehype-katex` to mdsvex config. No authoring changes needed. |
| Draft posts | Frontmatter `draft: true` field, filtered out in the glob import. |
| RSS feed | `/rss.xml` route, generated from the same glob import that powers the blog index. |
| Search | Client-side with pagefind (static index at build time). No server needed. |
| Gallery upload UI | A protected `/admin` route backed by Better Auth for adding assets to Postgres + uploading to object storage. |
| Analytics | Plausible or self-hosted Umami — both work as a single Docker service added to the prod compose file. |
