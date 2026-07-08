module.exports = ({ env }) => {
  const publicUrl = env('PUBLIC_URL');
  const isProduction = env('NODE_ENV') === 'production';

  const config = {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
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

  if (isProduction && publicUrl) {
    config.url = publicUrl;
  }

  return config;
};
