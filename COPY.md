# Copy `strapi/` folder to new repo

## Backend repo (copy whole `strapi/` folder)

```
strapi/
├── config/
├── src/
├── data/recovered-blogs.json   ← blog backup
├── scripts/
├── .env
├── package.json
└── yarn.lock
```

Skip: `node_modules/`, `.tmp/`, `build/`

```bash
yarn install
yarn develop          # local
yarn build && yarn start   # server
```

## Frontend repo (keep these files)

```
lib/strapi/client.js
lib/blogData.js
lib/blog-cover-fallback.json
.env                  → STRAPI_URL=https://your-backend-server.com
next.config.mjs
```

## Different hosts (no errors)

| Where | Setting |
|-------|---------|
| Backend `.env` | `FRONTEND_URL=https://www.fivetecglobalcapital.com` |
| Backend `.env` | `PUBLIC_URL=https://your-backend-server.com` |
| Frontend `.env` | `STRAPI_URL=https://your-backend-server.com` |

CORS is already set. Images use Cloudinary (`res.cloudinary.com`).

## First run on server

1. Set Supabase postgres in `strapi/.env` (uncomment DATABASE_* lines)
2. `yarn build && yarn start`
3. Open `https://your-backend-server.com/admin` → create admin if new DB
4. Blogs auto-import from `data/recovered-blogs.json` on first start
