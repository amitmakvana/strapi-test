# Five-Tec Strapi Backend

Blog CMS for [Five-Tec Global Capital](https://www.fivetecglobalcapital.com).

| Environment | Admin URL |
|-------------|-----------|
| **Local** | http://localhost:1337/admin |
| **Live** | https://blog.fivetecglobalcapital.com/admin |

---

## What is set up

| Item | Status |
|------|--------|
| Strapi 5 blog CMS | Ready |
| Supabase PostgreSQL (cloud database) | Connected |
| Cloudinary (blog images) | Connected |
| 11 blogs imported | Done |
| Auto SSL for Supabase | Handled in `config/database.js` |
| Live blog subdomain (Strapi) | Nginx config in `deploy/nginx.example.conf` |

---

## Local development

```bash
yarn install    # first time only
yarn dev
```

Open **http://localhost:1337/admin**

First time: create your admin account. Blogs load automatically from `data/recovered-blogs.json`.

---

## Environment (`.env`)

Everything is in **one file: `.env`**

| Variable | Live value |
|----------|------------|
| `FRONTEND_URL` | `https://www.fivetecglobalcapital.com` |
| `PUBLIC_URL` | `https://blog.fivetecglobalcapital.com` (server only) |

**Local:** comment out `PUBLIC_URL`. Never set `STRAPI_ADMIN_BACKEND_URL`.

### Frontend website (Next.js repo)

```env
STRAPI_URL=https://blog.fivetecglobalcapital.com
```

---

## Database (Supabase)

Project: **fivetecsocialcmsproject**  
Region: **ap-south-1 (Mumbai)**

Use the **Session pooler** from Supabase → **Connect** → **ORMs**:

- Host: `aws-1-ap-south-1.pooler.supabase.com`
- Port: `5432`
- User: `postgres.boewqbkaqobrqqixamdn`
- Database: `postgres`

Do **not** use `db.xxx.supabase.co` on Windows — it is IPv6-only and will fail locally.

If password fails: Supabase → **Settings → Database** → **Reset database password** → update `DATABASE_PASSWORD` in `.env`.

SSL is automatic — no extra env vars needed.

---

## Cloudinary (images)

All blog uploads go to Cloudinary. Set the four `CLOUDINARY_*` vars in `.env`. Images are served from `res.cloudinary.com`.

---

## Go live

**Full deploy guide:** [`deploy/README.md`](deploy/README.md)

### Live URLs (in `.env`)

| What | URL |
|------|-----|
| Website | https://www.fivetecglobalcapital.com |
| Strapi admin | https://blog.fivetecglobalcapital.com/admin |
| Blog API | https://blog.fivetecglobalcapital.com/api/blogs |

### Deploy on server

```bash
./deploy/build-live.sh
yarn start                # or: pm2 start deploy/ecosystem.config.cjs
```

### Frontend `.env` (Next.js)

```env
STRAPI_URL=https://blog.fivetecglobalcapital.com
```

### Nginx

Use `deploy/nginx.example.conf` — proxies `blog.fivetecglobalcapital.com` to Strapi (1337).

---

## Commands

| Command | Description |
|---------|-------------|
| `yarn dev` | Start Strapi (development) |
| `yarn build` | Build admin panel (required before live) |
| `yarn start` | Start Strapi (production) |
| `yarn sync:recovered` | Re-import blogs from `data/recovered-blogs.json` |
| `yarn scrape:live` | Import blogs from live website |
| `yarn import:covers` | Import cover images (needs `STRAPI_LOCAL_TOKEN`) |

---

## API

Public read access is enabled on bootstrap.

```
GET /api/blogs          → list all blogs
GET /api/blogs/:id      → single blog
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 1337 in use | Close other terminal, or `taskkill /F /IM node.exe` |
| Password authentication failed | Reset Supabase password → update `.env` |
| `ENOTFOUND db.xxx.supabase.co` | Use pooler host, not direct `db.` host |
| Admin API error on localhost | Comment out `PUBLIC_URL` in `.env`, restart `yarn dev` |
| Admin login loops on live | Run `./deploy/build-live.sh` on server, clear cookies |
| CORS error on live | Set `FRONTEND_URL` in `.env` |

---

## Project structure

```
Five-Tech-Backend/
├── config/              # database, server, CORS, Cloudinary
├── src/api/blog/        # blog content type + API
├── data/                # recovered-blogs.json (11 posts backup)
├── scripts/             # import / sync tools
├── deploy/              # nginx + deploy scripts
├── .env                 # all config + secrets (one file)
└── package.json
```

---

## Summary

**Local:** `yarn dev` → http://localhost:1337/admin  
**Live:** Nginx + `PUBLIC_URL` → https://blog.fivetecglobalcapital.com/admin  
**Database:** Supabase (pooler) — same DB for local and live  
**Images:** Cloudinary
