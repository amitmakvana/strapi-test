module.exports = ({ env }) => {
  const publicUrl = env('PUBLIC_URL');
  const isProduction = env('NODE_ENV') === 'production';

  const config = {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: env.array('APP_KEYS'),
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };

  if (isProduction && publicUrl) {
    config.url = publicUrl;
    // Trust X-Forwarded-* headers from reverse proxy (Nginx/Cloudflare).
    config.proxy = true;
  }

  return config;
};
