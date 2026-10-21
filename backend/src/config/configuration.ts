export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  encryptionKey: process.env.APP_ENCRYPTION_KEY ?? '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'chat:',
  },
});