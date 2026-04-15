export const authConfig = {
  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] ?? '',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] ?? '',
  jwtAccessTtlSeconds: 25200,
  jwtRefreshTtlSeconds: 2592000,
  bcryptSaltRounds: 10,
} as const;
