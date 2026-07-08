const path = require('path');
const CMS = require('./hardcoded');

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', CMS.database.client);
  const ssl = CMS.database.ssl
    ? { rejectUnauthorized: CMS.database.sslRejectUnauthorized ?? false }
    : false;

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl,
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        host: env('DATABASE_HOST', CMS.database.host),
        port: env.int('DATABASE_PORT', CMS.database.port),
        database: env('DATABASE_NAME', CMS.database.name),
        user: env('DATABASE_USERNAME', CMS.database.user),
        password: env('DATABASE_PASSWORD', CMS.database.password),
        ssl,
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
