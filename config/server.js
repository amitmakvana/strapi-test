const CMS = require('./hardcoded');

module.exports = ({ env }) => ({
  host: env('HOST', CMS.host),
  port: env.int('PORT', CMS.port),
  url: env('PUBLIC_URL', CMS.publicUrl),
  app: {
    keys: env.array('APP_KEYS', CMS.appKeys),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
