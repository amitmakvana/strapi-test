module.exports = ({ env }) => {
  const isProduction = env('NODE_ENV') === 'production';
  const publicUrl = env('PUBLIC_URL');
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:1337',
    env('FRONTEND_URL'),
  ].filter(Boolean);

  if (isProduction && publicUrl) {
    origins.push(publicUrl);
  }

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        origin: origins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        credentials: true,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    {
      name: 'strapi::session',
      config: {
        secure: isProduction,
        sameSite: 'lax',
      },
    },
    'strapi::favicon',
    'strapi::public',
  ];
};
