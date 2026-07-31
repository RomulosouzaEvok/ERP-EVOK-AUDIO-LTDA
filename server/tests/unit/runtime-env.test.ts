describe('runtimeEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('falha em producao quando DB_FORCE_SYNC=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_FORCE_SYNC = 'true';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('DB_FORCE_SYNC');
  });

  it('falha em producao quando DB_SSL nao esta habilitado', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'false';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('DB_SSL=true');
  });

  it('falha em producao quando JWT_SECRET usa placeholder', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = 'CHANGE_ME_LOCAL_DEV_SECRET_32_CHARS_MINIMUM';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  it('falha em producao quando CORS_ORIGIN aponta para localhost', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('CORS_ORIGIN');
  });

  it('retorna JWT configurado para runtime seguro', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.JWT_EXPIRE = '12h';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.getJwtRuntimeConfig()).toEqual({
      secret: '12345678901234567890123456789012',
      expiresIn: '12h',
    });
  });
});
