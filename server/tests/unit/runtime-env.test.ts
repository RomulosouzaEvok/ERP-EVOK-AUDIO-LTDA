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
    process.env.TRUST_PROXY = '1';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.getJwtRuntimeConfig()).toEqual({
      secret: '12345678901234567890123456789012',
      expiresIn: '12h',
    });
  });

  it('TRUST_PROXY default e 0 (nao confia em proxy nenhum) quando nao configurado', () => {
    delete process.env.TRUST_PROXY;

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.loadRuntimeEnv().trustProxy).toBe(0);
  });

  it('falha em producao quando TRUST_PROXY nao esta configurado ou e zero', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TRUST_PROXY;
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('TRUST_PROXY');
  });

  it('falha em producao quando TRUST_PROXY e zero explicitamente', () => {
    process.env.NODE_ENV = 'production';
    process.env.TRUST_PROXY = '0';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('TRUST_PROXY');
  });

  it('TRUST_PROXY respeita o valor configurado (numero de saltos de proxy)', () => {
    process.env.NODE_ENV = 'production';
    process.env.TRUST_PROXY = '2';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.loadRuntimeEnv().trustProxy).toBe(2);
  });
});
