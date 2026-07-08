module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  // Same as working FXtradehunt project: default session (no forced secure cookies)
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
