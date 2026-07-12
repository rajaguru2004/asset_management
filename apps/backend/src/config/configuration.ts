export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'asset-management-secret-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
