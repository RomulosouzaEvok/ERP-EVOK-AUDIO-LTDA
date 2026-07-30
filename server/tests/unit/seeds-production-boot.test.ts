/**
 * Test: Seeds Production Boot Failure
 *
 * Valida que o servidor falha no boot em produção quando ADMIN_SEED_PASSWORD
 * não está definida, em vez de engolir o erro e continuar normalmente.
 *
 * Critério de aceite F.4: Falha de `ADMIN_SEED_PASSWORD` deve interromper o boot,
 * não apenas logar um aviso.
 *
 * @group unit
 * @ticket F.4-Sprint-F
 */

jest.mock('../../src/models/index', () => ({
  User: {
    count: jest.fn(),
    create: jest.fn(),
  },
  Department: {
    bulkCreate: jest.fn(),
  },
  Category: {
    bulkCreate: jest.fn(),
  },
}));

import seedDatabase = require('../../src/config/seeds');

describe('Seeds - Production Boot Failure (F.4)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve falhar no boot em produção sem ADMIN_SEED_PASSWORD', async () => {
    const { User } = require('../../src/models/index');

    // Simula banco vazio (primeira execução)
    User.count.mockResolvedValueOnce(0);

    // Simula produção
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_SEED_PASSWORD;

    // Espera que seedDatabase lance erro (não engula)
    await expect(seedDatabase.default()).rejects.toThrow('ADMIN_SEED_PASSWORD é obrigatória em produção');

    // Confirma que User.create nunca foi chamado (não criou admin sem senha)
    expect(User.create).not.toHaveBeenCalled();
  });

  it('deve logar aviso mas continuar em desenvolvimento sem ADMIN_SEED_PASSWORD', async () => {
    const { User, Department, Category } = require('../../src/models/index');
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Simula banco vazio
    User.count.mockResolvedValueOnce(0);

    // Simula desenvolvimento
    process.env.NODE_ENV = 'development';
    delete process.env.ADMIN_SEED_PASSWORD;

    // Em dev, deve suceder (usa fallback de senha)
    await seedDatabase.default();

    // Confirma que User.create foi chamado com senha de fallback
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@evokaudio.com.br',
        password: 'dev-only-change-me', // fallback
        role: 'admin',
      })
    );

    // Confirma que aviso foi logado
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_SEED_PASSWORD ausente')
    );

    consoleWarnSpy.mockRestore();
  });

  it('deve usar ADMIN_SEED_PASSWORD quando definida em produção', async () => {
    const { User, Department, Category } = require('../../src/models/index');

    // Simula banco vazio
    User.count.mockResolvedValueOnce(0);

    // Simula produção com senha definida
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_SEED_PASSWORD = 'MySecurePassword123!';

    // Deve suceder
    await seedDatabase.default();

    // Confirma que User.create foi chamado com senha fornecida
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@evokaudio.com.br',
        password: 'MySecurePassword123!',
        role: 'admin',
      })
    );
  });

  it('deve pular seeds se banco já possui dados', async () => {
    const { User } = require('../../src/models/index');
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Simula banco com dados (não é primeira execução)
    User.count.mockResolvedValueOnce(5);

    // Deve retornar sem fazer nada
    await seedDatabase.default();

    // Confirma que User.create não foi chamado
    expect(User.create).not.toHaveBeenCalled();

    // Confirma que mensagem de "já possui dados" foi logada
    expect(consoleLogSpy).toHaveBeenCalledWith('📊 Banco já possui dados, seeds ignorados.');

    consoleLogSpy.mockRestore();
  });

  it('aviso quando ADMIN_SEED_PASSWORD muito curta', async () => {
    const { User, Department, Category } = require('../../src/models/index');
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Simula banco vazio
    User.count.mockResolvedValueOnce(0);

    // Senha curta em desenvolvimento
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_SEED_PASSWORD = '123'; // < 8 chars

    await seedDatabase.default();

    // Confirma aviso de senha curta
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_SEED_PASSWORD muito curta')
    );

    consoleWarnSpy.mockRestore();
  });
});
