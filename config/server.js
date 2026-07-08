module.exports = ({ env }) => {
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

  if (env('NODE_ENV') === 'production' && env('PUBLIC_URL')) {
    config.url = env('PUBLIC_URL');
    config.proxy = { koa: true };
  }

  return config;
};
