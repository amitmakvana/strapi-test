/** PM2 — run on server: pm2 start deploy/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'fivetec-strapi',
      cwd: __dirname + '/..',
      script: 'node_modules/@strapi/strapi/bin/strapi.js',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      error_file: './logs/strapi-error.log',
      out_file: './logs/strapi-out.log',
    },
  ],
};
