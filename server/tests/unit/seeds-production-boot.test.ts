jest.mock('../../src/models/index', () => ({
  User: {
    count: jest.fn(),
    create: jest.fn(),
  },
  Department: {
    bulkCreate: jest.fn(),
  },
  // Diretorias são criadas ANTES dos departamentos. Desde a correção V-1
  // (VARREDURA_DUPLA_2026-08-11.md) o seed usa `ignoreDuplicates` e depois
  // RELÊ as diretorias via `findAll` (instância retornada de linha
  // pré-existente não traz `id`), então o dublê precisa responder a ambos
  // com as linhas contendo `code`/`id` — um array vazio faria o `Map` de
  // resolução ficar vazio e todo departamento nasceria transversal.
  Directorate: {
    bulkCreate: jest.fn(async (rows: Array<{ code: string }>) =>
      rows.map((row, index) => ({ ...row, id: index + 1 })),
    ),
    findAll: jest.fn(async () =>
      ['CEO', 'IND', 'SUP', 'COM', 'ADM'].map((code, index) => ({ code, id: index + 1 })),
    ),
  },
  Category: {
    bulkCreate: jest.fn(),
  },
}));

function loadSeedModule() {
  const runtimeEnv = require('../../src/config/runtimeEnv');
  runtimeEnv.clearRuntimeEnvCache();

  return require('../../src/config/seeds');
}

describe('Seeds - Production Boot Failure (F.4)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    const runtimeEnv = require('../../src/config/runtimeEnv');
    runtimeEnv.clearRuntimeEnvCache();
  });

  it('deve falhar no boot em producao sem ADMIN_SEED_PASSWORD', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    delete process.env.ADMIN_SEED_PASSWORD;

    await expect(seedDatabase.default()).rejects.toThrow('ADMIN_SEED_PASSWORD');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('deve logar aviso mas continuar em desenvolvimento sem ADMIN_SEED_PASSWORD', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'development';
    delete process.env.ADMIN_SEED_PASSWORD;

    await seedDatabase.default();

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@evokaudio.com.br',
        password: 'dev-only-change-me',
        role: 'admin',
      }),
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_SEED_PASSWORD ausente'),
    );

    consoleWarnSpy.mockRestore();
  });

  it('deve usar ADMIN_SEED_PASSWORD quando definida em producao', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
    process.env.ADMIN_SEED_PASSWORD = 'MySecurePassword123!';

    await seedDatabase.default();

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@evokaudio.com.br',
        password: 'MySecurePassword123!',
        role: 'admin',
      }),
    );
  });

  it('deve pular seeds se banco ja possui dados', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    User.count.mockResolvedValueOnce(5);

    await seedDatabase.default();

    expect(User.create).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('📊 Banco já possui dados, seeds ignorados.');

    consoleLogSpy.mockRestore();
  });

  it('avisa quando ADMIN_SEED_PASSWORD e muito curta', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'development';
    process.env.ADMIN_SEED_PASSWORD = '123';

    await seedDatabase.default();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_SEED_PASSWORD muito curta'),
    );

    consoleWarnSpy.mockRestore();
  });
});
