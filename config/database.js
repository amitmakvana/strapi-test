const path = require('path');

function isSupabase(env) {
  const url = env('DATABASE_URL', '');
  const host = env('DATABASE_HOST', '');
  return url.includes('supabase.com') || host.includes('supabase.com');
}

function sslConfig(env) {
  const supabase = isSupabase(env);
  const enabled = env.bool('DATABASE_SSL', supabase);

  if (!enabled) {
    return false;
  }

  if (supabase) {
    return { rejectUnauthorized: false };
  }

  return {
    key: env('DATABASE_SSL_KEY', undefined),
    cert: env('DATABASE_SSL_CERT', undefined),
    ca: env('DATABASE_SSL_CA', undefined),
    capath: env('DATABASE_SSL_CAPATH', undefined),
    cipher: env('DATABASE_SSL_CIPHER', undefined),
    rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
  };
}

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');
  const supabase = isSupabase(env);
  const defaultPoolMin = supabase ? 0 : 2;
  const defaultPoolMax = supabase ? 5 : 10;

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslConfig(env),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', defaultPoolMin),
        max: env.int('DATABASE_POOL_MAX', defaultPoolMax),
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 30000),
        acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE_TIMEOUT', 60000),
      },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslConfig(env),
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', defaultPoolMin),
        max: env.int('DATABASE_POOL_MAX', defaultPoolMax),
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 30000),
        acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE_TIMEOUT', 60000),
      },
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
