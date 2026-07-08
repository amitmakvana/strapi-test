module.exports = ({ env }) => {
  const config = {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    rateLimit: {
      enabled: env.bool('ADMIN_RATE_LIMIT_ENABLED', false),
      interval: { min: env.int('ADMIN_RATE_LIMIT_INTERVAL_MIN', 5) },
      max: env.int('ADMIN_RATE_LIMIT_MAX', 50),
      delayAfter: env.int('ADMIN_RATE_LIMIT_DELAY_AFTER', 20),
      timeWait: env.int('ADMIN_RATE_LIMIT_TIME_WAIT', 3000),
      prefixKey: env('ADMIN_RATE_LIMIT_PREFIX_KEY', 'strapi-admin'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT'),
      },
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    },
  };

  return config;
};
