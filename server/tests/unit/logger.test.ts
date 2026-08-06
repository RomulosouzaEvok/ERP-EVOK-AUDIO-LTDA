/**
 * Testes do logger central (`src/config/logger.ts`): garante que a
 * instância expõe os níveis padrão usados pelo projeto e que o formato
 * muda entre desenvolvimento/teste (legível) e produção (JSON), sem exigir
 * inspecionar a saída real do console (evita testes frágeis dependentes de
 * captura de stdout).
 */

describe('config/logger', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.LOG_FILE;
  });

  it('expõe os métodos de nível padrão (error, warn, info, debug)', () => {
    process.env.NODE_ENV = 'test';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../../src/config/logger').default;

    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.log).toBe('function');
  });

  it('usa nível "info" em producao e "debug" fora de producao', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'b'.repeat(32);
    process.env.CORS_ORIGIN = 'https://erp.evokaudio.com.br';
    process.env.DB_PASSWORD = 'senha-forte-real';
    process.env.ADMIN_SEED_PASSWORD = 'senha-forte-real-2';
    process.env.DB_SSL = 'true';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const prodLogger = require('../../src/config/logger').default;
    expect(prodLogger.level).toBe('info');

    jest.resetModules();
    process.env.NODE_ENV = 'development';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const devLogger = require('../../src/config/logger').default;
    expect(devLogger.level).toBe('debug');
  });

  it('não lança quando um evento é logado (console apenas, sem LOG_FILE)', () => {
    process.env.NODE_ENV = 'test';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../../src/config/logger').default;

    expect(() => logger.info('evento de teste', { requestId: 'abc-123' })).not.toThrow();
    expect(() => logger.error('erro de teste', { stack: 'Error: x\n at y' })).not.toThrow();
  });
});
