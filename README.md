# Strapi Project Guide (No Docker)

This guide explains how to run and manage this Strapi project locally and in production without Docker.

## 1) Project basics

- Framework: Strapi v5
- Package manager: `yarn`
- Default local URL: `http://localhost:1337`
- Admin panel: `http://localhost:1337/admin`
- Main content collection: `blog`

## 2) Requirements

- Node.js `>=20 <=24`
- Yarn installed
- Network access to PostgreSQL (Supabase in current config)

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
- `yarn migrate:from-cloud` -> migrate content from old Strapi Cloud

## 4) Configuration model in this project

This repository is configured to read most values from:

- `config/hardcoded.ts`

And fallback/override via env-aware config files:

- `config/server.ts`
- `config/admin.ts`
- `config/database.ts`
- `config/plugins.ts`

Important:

- Current project is not `.env`-first. It uses hardcoded config values.
- For better security across environments, move secrets to environment variables before reusing in other projects.

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

## 8) Migration in this project (Strapi Cloud -> this instance)

This repo includes a migration script:

- `scripts/migrate-from-cloud.mjs`

It migrates `blog` entries from old cloud instance to target Strapi, including media upload and publish.

### Run migration

PowerShell:

```powershell
$env:STRAPI_TARGET_URL="http://localhost:1337"
$env:STRAPI_TARGET_TOKEN="paste_full_access_token_here"
yarn migrate:from-cloud
```

CMD:

```cmd
set STRAPI_TARGET_URL=http://localhost:1337
set STRAPI_TARGET_TOKEN=paste_full_access_token_here
yarn migrate:from-cloud
```

### Migration behavior summary

- Pulls published blogs from source cloud.
- Uploads cover/meta images to target `/api/upload`.
- Upserts by `slug` (update if slug exists, create if missing).
- Publishes migrated entries on target.

### Safe migration checklist

1. Backup target database.
2. Validate API token has needed scope.
3. Run migration in staging first.
4. Verify:
   - post count
   - slug uniqueness
   - image links
   - published status

## 9) Cookies and session management

Session middleware is enabled in:

- `config/middlewares.ts` via `strapi::session`

Session and cookie signing are tied to app keys in:

- `config/server.ts` -> `app.keys`

### What this means

- Strapi signs cookies/sessions using `APP_KEYS` (or hardcoded fallback in current project).
- Changing app keys invalidates existing signed cookies/sessions.
- Keep keys stable per environment unless you intentionally want forced logout.

### Recommended practices

- Store `APP_KEYS` as env vars per environment.
- Rotate keys in a planned window (expect admin logout/session reset).
- Use HTTPS in production so secure cookie behavior is reliable behind your reverse proxy.

## 10) Strapi upgrade and schema change notes

### Upgrade Strapi

```bash
yarn upgrade:dry
yarn upgrade
```

After upgrade:

1. Run `yarn develop`.
2. Confirm admin loads.
3. Test blog CRUD and publish flow.
4. Test frontend API responses.

### Schema/content model changes

When adding/removing fields:

- Update frontend queries and UI mapping.
- Re-check permissions for new fields/content types.
- Re-run migration or backfill script if old data needs new fields.

## 11) Production run (without Docker)

Typical production flow:

```bash
yarn install
yarn build
yarn start
```

Minimum production env variables (recommended):

- `NODE_ENV=production`
- `HOST`
- `PORT`
- `PUBLIC_URL`
- `APP_KEYS`
- `ADMIN_JWT_SECRET`
- `API_TOKEN_SALT`
- `TRANSFER_TOKEN_SALT`
- `ENCRYPTION_KEY`
- Database credentials
- Cloudinary credentials

## 12) Common issues and fixes

### SSL/self-signed certificate issue (Supabase)

- Check `config/database.ts` SSL settings.
- Current config supports `sslRejectUnauthorized: false` for dev compatibility.

### Database authentication failed

- Re-check DB username/password and host/port in config.

### API returns empty for public users

- Enable permissions for required role/actions in Users & Permissions settings.

### Content not visible on website

- Confirm entry is **published**.
- Confirm frontend points to correct Strapi URL and valid token.

## 13) Security cleanup recommended before reuse in other projects

Before using this setup in another project:

1. Move all secrets out of `config/hardcoded.ts`.
2. Rotate exposed secrets (DB, Cloudinary, JWT, salts, keys).
3. Keep only non-sensitive defaults in code.
4. Use environment-specific secret management.
