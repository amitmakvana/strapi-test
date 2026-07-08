module.exports = ({ env }) => {
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:1337',
    env('FRONTEND_URL'),
  ].filter(Boolean);

  if (env('NODE_ENV') === 'production' && env('PUBLIC_URL')) {
    origins.push(env('PUBLIC_URL'));
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
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};
