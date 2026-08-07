/**
 * Teste de fumaça: garante que o router agregador do módulo TI
 * (`server/src/modules/ti/presentation/routes/ti.ts`) e toda a cadeia de
 * `require` (controllers → use cases → repositórios/mappers/adapters →
 * models) carrega sem erro de módulo/caminho — não exercita nenhuma rota
 * HTTP real, só a resolução de imports (mesmo padrão de
 * `sst-rbac.test.ts`, que já faz `require(...)` do router inteiro do SST).
 *
 * @group unit
 */

describe('modulo ti — smoke test de carregamento', () => {
  it('router ti.ts carrega sem lancar erro', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tiRouter = require('../../src/modules/ti/presentation/routes/ti');
    expect(tiRouter).toBeDefined();
  });

  it('todos os 5 controllers exportam as funcoes esperadas', () => {
    const ticketController = require('../../src/modules/ti/presentation/controllers/ticketController');
    const termController = require('../../src/modules/ti/presentation/controllers/termController');
    const licenseController = require('../../src/modules/ti/presentation/controllers/licenseController');
    const accessRequestController = require('../../src/modules/ti/presentation/controllers/accessRequestController');
    const backupController = require('../../src/modules/ti/presentation/controllers/backupController');

    expect(typeof ticketController.create).toBe('function');
    expect(typeof ticketController.ticketOwnershipCheck).toBe('function');
    expect(typeof termController.create).toBe('function');
    expect(typeof licenseController.allocateSeat).toBe('function');
    expect(typeof accessRequestController.execute).toBe('function');
    expect(typeof accessRequestController.approverEligibilityCheck).toBe('function');
    expect(typeof backupController.health).toBe('function');
  });

  it('accessModules.ts inclui a chave "ti"', () => {
    const { isValidAccessModuleKey } = require('../../src/shared/domain/accessModules');
    expect(isValidAccessModuleKey('ti')).toBe(true);
  });
});
