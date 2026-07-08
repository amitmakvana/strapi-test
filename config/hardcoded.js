/**
 * CMS defaults (same pattern as working FXtradehunt project).
 * Env vars override these when set. No Docker required.
 */
module.exports = {
  host: '0.0.0.0',
  port: 1337,
  publicUrl: 'https://blog.fivetecglobalcapital.com',
  appKeys: [
    '2fK9vLmP0qR7sT4uV6wX8yZ=',
    'aBcDeFgHiJkLmNoPqRsTuVw=',
    'XyZ123AbC456DeF789GhIjKl=',
    'MnOpQrStUvWxYz0123456789=',
  ],
  apiTokenSalt: 'fivetec-api-token-salt-2026',
  adminJwtSecret: 'fivetec-admin-jwt-secret-2026',
  transferTokenSalt: 'fivetec-transfer-salt-2026',
  encryptionKey: 'fivetec-encryption-key-32chars!!',
  jwtSecret: 'fivetec-jwt-secret-2026',
  database: {
    client: 'postgres',
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    // Same approach as working project: prefer pooler port 6543 to avoid session max clients
    port: 6543,
    name: 'postgres',
    user: 'postgres.boewqbkaqobrqqixamdn',
    password: "'+]sAfE9U|9?..6g5C~KjL2",
    ssl: true,
    sslRejectUnauthorized: false,
  },
  cloudinary: {
    cloud_name: 'dejgscbo2',
    api_key: '686489485173457',
    api_secret: 'k-HoiItR79nJOBHdJ1pvP7uCnV0',
  },
};
