/**
 * Boot recusa subir em producao com o apontamento obrigatorio DESLIGADO.
 *
 * ## A brecha (auditoria de 2026-08-11)
 *
 * `PRODUCTION_TRACKING_REQUIRED=warn` desliga, de uma vez, o G4 (apontamento
 * obrigatorio na conclusao da OP) e o G6 (gate de partida) — as duas regras
 * que sustentam o Bloco K / Livro modelo 3 e o custo de mao-de-obra real. A
 * variavel foi desenhada como **janela de transicao temporaria** para o UAT.
 *
 * A varredura mostrou que ela nao era declarada em lugar nenhum: nao estava
 * no `.env.example`, nem no docker-compose, nem em script de boot. So o
 * codigo a lia. Ou seja: uma linha solta num `.env` de producao, escrita
 * durante o UAT e esquecida, desligaria duas obrigacoes fiscais **em
 * silencio** — sem log de boot, sem alerta, sem ninguem para notar.
 *
 * O modo continua existindo (a janela de transicao e legitima em
 * desenvolvimento/homologacao). O que muda e que, com `NODE_ENV=production`,
 * o processo **nao sobe** com ele ligado: falha de boot e ruidosa e imediata,
 * ao contrario de uma regra fiscal que simplesmente para de valer.
 *
 * @module tests/unit/runtime-env-production-tracking
 */
describe('runtimeEnv — PRODUCTION_TRACKING_REQUIRED em producao (G4/G6)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Preenche o restante das exigencias de producao, para que o unico motivo
   * possivel de falha seja o que cada teste esta exercitando.
   *
   * @returns void
   */
  function withProductionBaseline(): void {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';
    process.env.TRUST_PROXY = '1';
  }

  it('falha o boot em producao quando PRODUCTION_TRACKING_REQUIRED=warn', () => {
    withProductionBaseline();
    process.env.PRODUCTION_TRACKING_REQUIRED = 'warn';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('PRODUCTION_TRACKING_REQUIRED');
  });

  it('falha o boot em producao com maiusculas/espacos ao redor de warn', () => {
    withProductionBaseline();
    // A leitura do modo normaliza (`trim().toLowerCase()`), entao a validacao
    // de boot precisa normalizar igual — senao ' WARN ' passaria pelo boot e
    // desligaria as regras assim mesmo.
    process.env.PRODUCTION_TRACKING_REQUIRED = ' WARN ';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('PRODUCTION_TRACKING_REQUIRED');
  });

  it('sobe em producao com PRODUCTION_TRACKING_REQUIRED=block', () => {
    withProductionBaseline();
    process.env.PRODUCTION_TRACKING_REQUIRED = 'block';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.loadRuntimeEnv().productionTrackingRequired).toBe('block');
  });

  it('sobe em producao com a variavel AUSENTE (o default ja e a lei)', () => {
    withProductionBaseline();
    delete process.env.PRODUCTION_TRACKING_REQUIRED;

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.loadRuntimeEnv().productionTrackingRequired).toBe('block');
  });

  it('sobe em producao com valor INVALIDO — ele resolve para block, o lado seguro', () => {
    withProductionBaseline();
    // Um typo cai em `block` na leitura do modo (com log de erro,
    // `G4-TRACKING-MODE-INVALID`). Reprovar o boot aqui seria derrubar
    // producao por causa de um valor que NAO desliga regra nenhuma.
    process.env.PRODUCTION_TRACKING_REQUIRED = 'blok';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.loadRuntimeEnv().productionTrackingRequired).toBe('block');
  });

  it('fora de producao, warn continua permitido (a janela de transicao existe)', () => {
    process.env.NODE_ENV = 'development';
    process.env.PRODUCTION_TRACKING_REQUIRED = 'warn';

    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();

    expect(runtimeEnv.loadRuntimeEnv().productionTrackingRequired).toBe('warn');
  });
});
