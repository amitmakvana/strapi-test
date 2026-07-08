#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_ENV=production
yarn build
echo "Done. Run: pm2 restart fivetec-strapi"
