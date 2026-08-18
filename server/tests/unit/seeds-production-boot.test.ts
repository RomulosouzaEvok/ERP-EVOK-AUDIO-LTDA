jest.mock('../../src/models/index', () => ({
  User: {
    count: jest.fn(),
    create: jest.fn(),
  },
  Department: {
    bulkCreate: jest.fn(),
  },
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

function configureCommonEnv(): void {
  process.env.DB_SSL = 'true';
  process.env.DB_PASSWORD = 'Sup3rS3cretPass!';
  process.env.JWT_SECRET = '12345678901234567890123456789012';
  process.env.CORS_ORIGIN = 'https://app.evokaudio.com.br';
}

describe('Seeds - Production Boot Failure (CASE-018)', () => {
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

  it('rejeita seed do admin em desenvolvimento sem ADMIN_SEED_PASSWORD', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'development';
    delete process.env.ADMIN_SEED_PASSWORD;

    await expect(seedDatabase.default()).rejects.toThrow('ADMIN_SEED_PASSWORD');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejeita seed do admin em producao sem ADMIN_SEED_PASSWORD', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'production';
    configureCommonEnv();
    delete process.env.ADMIN_SEED_PASSWORD;

    await expect(seedDatabase.default()).rejects.toThrow('ADMIN_SEED_PASSWORD');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejeita placeholder de ADMIN_SEED_PASSWORD em desenvolvimento', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'development';
    process.env.ADMIN_SEED_PASSWORD = 'CHANGE_ME_REQUIRED_IN_PRODUCTION';

    await expect(seedDatabase.default()).rejects.toThrow('placeholder');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('aceita senha forte e cria o admin inicial em desenvolvimento', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();

    User.count.mockResolvedValueOnce(0);

    process.env.NODE_ENV = 'development';
    process.env.ADMIN_SEED_PASSWORD = 'SenhaSegura123!';

    await expect(seedDatabase.default()).resolves.toBeUndefined();
    const createdUser = User.create.mock.calls[0][0];
    expect(createdUser).toEqual(
      expect.objectContaining({
        email: 'admin@evokaudio.com.br',
        role: 'admin',
        active: true,
      }),
    );
    expect(createdUser.password).toHaveLength(15);
  });

  it('não tenta criar admin quando já existem usuários, mesmo sem senha configurada', async () => {
    const { User } = require('../../src/models/index');
    const seedDatabase = loadSeedModule();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    User.count.mockResolvedValueOnce(5);

    process.env.NODE_ENV = 'development';
    delete process.env.ADMIN_SEED_PASSWORD;

    await expect(seedDatabase.default()).resolves.toBeUndefined();

    expect(User.create).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });
});
