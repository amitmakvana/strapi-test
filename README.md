# Strapi Project Guide (No Docker)

This guide explains how to run and manage this Strapi project locally and in production without Docker.

## 1) Project basics

- Framework: Strapi v5.47
- Package manager: `yarn` (or `npm`)
- Default local URL: `http://localhost:1337`
- Admin panel: `http://localhost:1337/admin`
- Live admin: `https://strapi-test-p164.onrender.com/admin`
- Main content collection: `blog`

## 2) Requirements

- Node.js `>=20 <=24`
- Yarn installed
- Network access to PostgreSQL (Supabase pooler)

Check versions:

```bash
node -v
yarn -v
```

## 3) Install and run Strapi

From project root:

```bash
yarn install
yarn develop
```

Then open:

- Admin: `http://localhost:1337/admin`

First run:

- Create the admin user (email + password).

Useful scripts:

- `yarn develop` -> run dev server
- `yarn build` -> build admin + backend
- `yarn start` -> run production server
- `yarn migrate:from-cloud` -> migrate content from source Strapi
- `yarn scrape:live` / `yarn sync:live` / `yarn sync:recovered` / `yarn import:covers`

## 4) Configuration model in this project

This repository reads defaults from:

- `config/hardcoded.js`

And env-aware overrides from:

- `config/server.js`
- `config/admin.js`
- `config/database.js`
- `config/plugins.js`
- `config/middlewares.js`

Important:

- Same pattern as the working FXtradehunt project (hardcoded fallbacks + env override).
- Auth uses default `strapi::session` (no forced secure-cookie hacks).
- `PUBLIC_URL` must match the exact browser domain.
- Do not set `STRAPI_ADMIN_BACKEND_URL`.
- No Docker required.

## 5) How to add/manage content in Strapi

### Add a new blog post

1. Go to Admin -> Content Manager -> `Blog`.
2. Click **Create new entry**.
3. Fill required fields (title, slug, content, etc.).
4. Click **Save**.
5. Click **Publish** to make it live.

### Edit existing post

1. Open the entry in Content Manager.
2. Update fields.
3. Save.
4. Publish again if needed.

### Unpublish or delete

- Use entry actions in the editor/list page.
- Unpublish keeps data but removes it from published API responses.

## 6) How to add new fields or new content types

### Add field in existing collection type

1. Admin -> Content-Type Builder.
2. Open `Blog`.
3. Add field (text, rich text, media, relation, etc.).
4. Save and let Strapi restart.

### Add a new collection type

1. Admin -> Content-Type Builder -> **Create new collection type**.
2. Define fields.
3. Save/restart.
4. Configure permissions in:
   - Settings -> Users & Permissions Plugin -> Roles
5. Create and publish entries from Content Manager.

## 7) API token and permission setup

### Create API token

1. Admin -> Settings -> API Tokens.
2. Create token (usually read-only for frontend, full-access only for migration/admin automation).
3. Copy once and store securely.

### Configure role permissions

1. Admin -> Settings -> Users & Permissions Plugin -> Roles.
2. For `Public`/`Authenticated`, allow only required actions (`find`, `findOne`, etc.).
3. Keep create/update/delete disabled for public APIs unless absolutely required.

## 8) Migration in this project

This repo includes:

- `scripts/migrate-from-cloud.mjs`

PowerShell:

```powershell
$env:STRAPI_SOURCE_URL="https://source-strapi-url"
$env:STRAPI_TARGET_URL="http://localhost:1337"
$env:STRAPI_TARGET_TOKEN="paste_full_access_token_here"
yarn migrate:from-cloud
```

## 9) Cookies and session management

Session middleware:

- `config/middlewares.js` -> `strapi::session` (default, same as working project)

App keys:

- `config/server.js` -> `app.keys` from `APP_KEYS` / `hardcoded.js`

Important:

- Keep `APP_KEYS` stable per environment.
- Changing keys logs everyone out.
- `PUBLIC_URL` must equal live domain exactly.

## 10) Strapi upgrade and schema change notes

```bash
yarn upgrade:dry
yarn upgrade
```

After upgrade:

1. Run `yarn develop`.
2. Confirm admin loads.
3. Test blog CRUD and publish flow.
4. Test frontend API responses.

## 11) Production run (without Docker)

```bash
yarn install
yarn build
yarn start
```

Render/PM2 set:

- `NODE_ENV=production`
- `PUBLIC_URL=https://strapi-test-p164.onrender.com`
- secrets (`APP_KEYS`, JWT, DB, Cloudinary)
- Do not set `STRAPI_ADMIN_BACKEND_URL`

## 12) Common issues and fixes

### Admin login loops back to login

1. `PUBLIC_URL` must match browser URL exactly.
2. Keep `APP_KEYS` / `ADMIN_JWT_SECRET` stable.
3. Rebuild (`yarn build`) and restart.
4. Clear site cookies / use Incognito.

### Database max clients (`EMAXCONNSESSION`)

- Prefer Supabase pooler port `6543` (transaction mode), same as working project.
- Keep pool max modest.

### API returns empty for public users

- Enable `find` / `findOne` for Public role.
- Confirm entry is published.

## 13) Security cleanup recommended before reuse

1. Rotate secrets if exposed.
2. Prefer env secrets on live host.
3. Keep only non-sensitive defaults in code if needed.
4. Never commit real production passwords to public repos.
