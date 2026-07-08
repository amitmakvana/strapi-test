# Live deploy

**Admin:** https://blog.fivetecglobalcapital.com/admin  
**API:** https://blog.fivetecglobalcapital.com/api/blogs

## Server `.env`

```env
PUBLIC_URL=https://blog.fivetecglobalcapital.com
FRONTEND_URL=https://www.fivetecglobalcapital.com
```

Do not set `STRAPI_ADMIN_BACKEND_URL`.

## Deploy on server

```bash
git pull
./deploy/build-live.sh
pm2 restart fivetec-strapi
```

First time nginx:

```bash
sudo cp deploy/nginx.example.conf /etc/nginx/sites-available/fivetec-blog
sudo ln -sf /etc/nginx/sites-available/fivetec-blog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Frontend

```env
STRAPI_URL=https://blog.fivetecglobalcapital.com
```
