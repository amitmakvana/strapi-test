const CMS = require('./hardcoded');

module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', CMS.adminJwtSecret),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', CMS.apiTokenSalt),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', CMS.transferTokenSalt),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY', CMS.encryptionKey),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
