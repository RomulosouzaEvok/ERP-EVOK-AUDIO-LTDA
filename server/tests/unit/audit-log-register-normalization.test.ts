/**
 * `AuditLog.register`: normalização de vocabulário no ponto de gravação.
 *
 * A tradução de sinônimo mora no `register` (e não no `auditLogService`) para
 * que QUALQUER chamador fique coberto, inclusive um futuro que não passe pelo
 * wrapper. Estes testes provam as duas metades da decisão de projeto:
 *
 * 1. o valor persistido é sempre canônico — nada fora de
 *    `enum_audit_logs_action` chega ao Postgres;
 * 2. o verbo específico do módulo **não se perde**: vira o marcador
 *    `[verbo]` no início da `description`, consultável por
 *    `description LIKE '[award]%'`.
 *
 * Sem (2), normalizar 29 verbos seria perda de granularidade — e uma trilha
 * de auditoria só vale se distinguir o que precisa ser distinguido.
 *
 * @module tests/unit/audit-log-register-normalization
 */

// Sequelize com dialeto real (postgres) e SEM conexão: `define` e a montagem
// do model funcionam offline; nenhuma query é emitida porque `create` é
// espionado. Mesmo espírito dos demais unitários (nenhum toca banco).
jest.mock('../../src/config/database', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Sequelize } = require('sequelize');
  return {
    sequelize: new Sequelize('erp_test', 'user', 'pass', {
      host: '127.0.0.1', dialect: 'postgres', logging: false,
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AuditLog = require('../../src/models/AuditLog');

describe('AuditLog.register: vocabulário canônico + marcador do verbo', () => {
  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    createSpy = jest.spyOn(AuditLog, 'create').mockResolvedValue({} as any);
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('traduz sinônimo de módulo e preserva o verbo na descrição default', async () => {
    await AuditLog.register({ action: 'award', entityType: 'Rfq', entityId: 12 });

    expect(createSpy.mock.calls[0][0]).toMatchObject({
      action: 'approve',
      description: '[award] award em Rfq #12',
    });
  });

  it('preserva o verbo também quando o chamador fornece a descrição', async () => {
    await AuditLog.register({
      action: 'mrp_auto_convert_to_requisition',
      entityType: 'PurchaseRequisition',
      entityId: 5,
      description: 'Requisicao RQ-5 gerada automaticamente pelo MRP',
    });

    expect(createSpy.mock.calls[0][0]).toMatchObject({
      action: 'create',
      description: '[mrp_auto_convert_to_requisition] Requisicao RQ-5 gerada automaticamente pelo MRP',
    });
  });

  it('não marca nada quando o verbo já é canônico', async () => {
    await AuditLog.register({ action: 'create', entityType: 'Sale', entityId: 1, description: 'Venda criada' });

    expect(createSpy.mock.calls[0][0]).toMatchObject({
      action: 'create',
      description: 'Venda criada',
    });
  });

  it('normaliza entityId UUID para null, sem tentar persistir NaN em coluna integer', async () => {
    await AuditLog.register({
      action: 'create',
      entityType: 'Item',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      entityDescription: 'ITEM-UUID',
    });

    expect(createSpy.mock.calls[0][0]).toMatchObject({
      action: 'create',
      entity_id: null,
      entity_type: 'Item',
    });
  });

  /**
   * `assign` é o caso de permissão: atribuir perfil de acesso a um usuário
   * vira `permission_change`, que é o filtro que um auditor de segurança
   * realmente usa ("todas as mudanças de permissão do período").
   */
  it('classifica atribuição de perfil como mudança de permissão', async () => {
    await AuditLog.register({ action: 'assign', entityType: 'User', entityId: 3 });

    expect(createSpy.mock.calls[0][0].action).toBe('permission_change');
  });

  /** Verbo desconhecido não pode derrubar a gravação nem sumir. */
  it('grava verbo desconhecido como genérico marcado, em vez de perder o evento', async () => {
    await AuditLog.register({ action: 'verbo_inexistente' as any, entityType: 'Sale', entityId: 4 });

    expect(createSpy.mock.calls[0][0]).toMatchObject({
      action: 'update',
      description: '[verbo_inexistente] verbo_inexistente em Sale #4',
    });
  });
});
