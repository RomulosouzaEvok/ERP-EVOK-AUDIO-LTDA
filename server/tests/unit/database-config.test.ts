describe('database config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('usa rejectUnauthorized=true quando DB_SSL=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    const databaseConfig = require('../../src/config/database');
    const config = databaseConfig.getConfig('production');

    expect(config.dialectOptions).toEqual({
      ssl: {
        require: true,
        rejectUnauthorized: true,
      },
    });
  });
});
