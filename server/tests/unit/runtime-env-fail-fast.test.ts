describe('runtimeEnv fail-fast (missing JWT_SECRET)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('lança erro quando JWT_SECRET está ausente', () => {
    process.env.JWT_SECRET = '';
    process.env.NODE_ENV = 'development';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow(/JWT_SECRET/);
  });
});
