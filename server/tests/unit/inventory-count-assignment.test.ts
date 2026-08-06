/**
 * Atribuição de contagens de inventário cíclico a funcionário específico
 * e/ou "pool" (docs/governance/TODO.md, evolução 2026-08-06).
 *
 * Cobre:
 * 1. Criação com `assigned_to` definido.
 * 2. Criação sem `assigned_to` (pool).
 * 3. `start` de uma contagem do pool por um funcionário -> claim atômico
 *    (`assigned_to` passa a ser dele).
 * 4. `start` de uma contagem já atribuída a OUTRO funcionário -> erro de
 *    negócio (`ConflictError`, 409).
 * 5. `start` de uma contagem já atribuída ao PRÓPRIO usuário -> funciona
 *    normalmente (idempotente).
 * 6. `ListInventoryCountsUseCase` repassando os filtros `assigned_to`
 *    (atalho `me` resolvido pelo controller antes de chegar aqui) e
 *    `unassigned` (pool) ao repositório.
 *
 * Achados de auditoria 2026-08-06 (contagem atribuída "presa" sem
 * recuperação, `assigned_to` sem validação do usuário-alvo), também
 * cobertos aqui:
 * 7. Criação com `assigned_to` inexistente/inativo -> `ValidationError` (422).
 * 8. `start` por `admin` de uma contagem atribuída a OUTRO funcionário ->
 *    override permitido (admin assume a contagem).
 * 9. `ReassignInventoryCountUseCase`: reatribuição feliz, devolução ao pool
 *    (`assigned_to: null`), status inválido (422) e usuário-alvo
 *    inexistente/inativo (422).
 *
 * @group unit
 * @ticket inventory-count-assignment-2026-08-06
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      id: 'tx-inv-count-assign-1',
      LOCK: { UPDATE: 'UPDATE' },
      finished: undefined,
      commit: jest.fn(async function (this: any) { this.finished = 'commit'; }),
      rollback: jest.fn(async function (this: any) { this.finished = 'rollback'; }),
    })),
  },
}));

// `CreateInventoryCountUseCase` faz `require('.../SequelizeItemRepository')`
// no topo do módulo, que por sua vez faz `require('.../models/index')` —
// isso disparava `sequelize.define(...)` REAL (fora do mock acima) ao
// simplesmente importar o use case. Mocka `models/index` com stubs mínimos
// (não usados nestes testes, já que `product_ids`/`item_ids` não são
// exercitados aqui) para poder testar `assigned_to` isoladamente, mesmo
// padrão de `warehouse-invariants.test.ts`.
jest.mock('../../src/models/index', () => ({
  Item: {},
  Product: {},
  User: {},
  Warehouse: {},
  ProductWarehouseStock: {},
  InventoryMovement: {},
  InventoryCount: {},
  InventoryCountItem: {},
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreateInventoryCountUseCase = require('../../src/modules/inventory/application/use-cases/CreateInventoryCountUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StartInventoryCountUseCase = require('../../src/modules/inventory/application/use-cases/StartInventoryCountUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReassignInventoryCountUseCase = require('../../src/modules/inventory/application/use-cases/ReassignInventoryCountUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ListInventoryCountsUseCase = require('../../src/modules/inventory/application/use-cases/ListInventoryCountsUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const InventoryCountEntity = require('../../src/modules/inventory/domain/entities/InventoryCountEntity');

function buildCreateRepository() {
  return {
    create: jest.fn(async (data: any) => ({ id: 501, ...data })),
    countByCountNumberPrefix: jest.fn(async () => 0),
    bulkCreateItems: jest.fn(async (items: any[]) => items),
    findProductById: jest.fn(async () => null),
    // Por padrão, qualquer id informado em `assigned_to` "existe e está
    // ativo" — testes de validação (item 7) sobrescrevem este mock.
    findActiveUserById: jest.fn(async (id: number) => ({ id, active: true })),
  };
}

describe('CreateInventoryCountUseCase — assigned_to (atribuição específica ou pool)', () => {
  it('persiste assigned_to quando informado (atribuição específica)', async () => {
    const repository = buildCreateRepository();
    const useCase = new CreateInventoryCountUseCase(repository);

    const { count } = await useCase.execute({
      count_type: 'cycle', warehouse_id: 2, created_by: 7, assigned_to: 15
    });

    expect(count.assigned_to).toBe(15);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to: 15 }),
      expect.anything()
    );
  });

  it('persiste assigned_to como null quando ausente (contagem fica no pool)', async () => {
    const repository = buildCreateRepository();
    const useCase = new CreateInventoryCountUseCase(repository);

    const { count } = await useCase.execute({
      count_type: 'cycle', warehouse_id: 2, created_by: 7
    });

    expect(count.assigned_to).toBeNull();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to: null }),
      expect.anything()
    );
  });

  it('rejeita criação com assigned_to inexistente/inativo (422/ValidationError, sem side-effect)', async () => {
    const repository = buildCreateRepository();
    repository.findActiveUserById = jest.fn(async () => null);
    const useCase = new CreateInventoryCountUseCase(repository);

    await expect(
      useCase.execute({ count_type: 'cycle', warehouse_id: 2, created_by: 7, assigned_to: 999 })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('não encontrado ou inativo'),
    });

    expect(repository.findActiveUserById).toHaveBeenCalledWith(999, expect.anything());
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('InventoryCountEntity.toRepositoryInput expõe assigned_to (null por padrão)', () => {
    const entity = new InventoryCountEntity({ warehouse_id: 2, created_by: 7 });
    expect(entity.toRepositoryInput()).toMatchObject({ assigned_to: null });

    const entityWithAssignee = new InventoryCountEntity({ warehouse_id: 2, created_by: 7, assigned_to: 42 });
    expect(entityWithAssignee.toRepositoryInput()).toMatchObject({ assigned_to: 42 });
  });
});

describe('StartInventoryCountUseCase — claim atômico do pool / trava de atribuição', () => {
  function buildStartRepository(count: any) {
    return {
      findRawByIdForUpdate: jest.fn(async () => count),
      update: jest.fn(async () => 1),
      findById: jest.fn(async () => ({ ...count, status: 'counting' })),
    };
  }

  it('inicia contagem do pool (assigned_to null) -> faz claim atômico para o usuário logado', async () => {
    const count = { id: 1, status: 'draft', assigned_to: null };
    const repository = buildStartRepository(count);
    const useCase = new StartInventoryCountUseCase(repository);

    await useCase.execute({ id: 1, userId: 33 });

    expect(repository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'counting', assigned_to: 33 }),
      expect.anything()
    );
  });

  it('rejeita início de contagem já atribuída a OUTRO funcionário (409/ConflictError)', async () => {
    const count = { id: 2, status: 'draft', assigned_to: 99 };
    const repository = buildStartRepository(count);
    const useCase = new StartInventoryCountUseCase(repository);

    await expect(useCase.execute({ id: 2, userId: 33 })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('já foi atribuída a outro funcionário'),
    });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('inicia normalmente contagem já atribuída ao PRÓPRIO usuário (idempotente, sem reatribuir)', async () => {
    const count = { id: 3, status: 'draft', assigned_to: 33 };
    const repository = buildStartRepository(count);
    const useCase = new StartInventoryCountUseCase(repository);

    await useCase.execute({ id: 3, userId: 33 });

    // Não deve incluir assigned_to no update (já é do próprio usuário) — só status/started_at.
    expect(repository.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ status: 'counting' }),
      expect.anything()
    );
    const updateCallData = repository.update.mock.calls[0][1];
    expect(updateCallData).not.toHaveProperty('assigned_to');
  });

  it('continua rejeitando início de contagem que não está em draft (BusinessRuleError, 422), independente de assigned_to', async () => {
    const count = { id: 4, status: 'counting', assigned_to: null };
    const repository = buildStartRepository(count);
    const useCase = new StartInventoryCountUseCase(repository);

    await expect(useCase.execute({ id: 4, userId: 33 })).rejects.toMatchObject({ statusCode: 422 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('admin assume (override) contagem já atribuída a OUTRO funcionário, em vez de 409 (achado de auditoria 2026-08-06, item 1b)', async () => {
    const count = { id: 5, status: 'draft', assigned_to: 99 };
    const repository = buildStartRepository(count);
    const useCase = new StartInventoryCountUseCase(repository);

    const result = await useCase.execute({ id: 5, userId: 33, role: 'admin' });

    expect(repository.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ status: 'counting', assigned_to: 33 }),
      expect.anything()
    );
    expect(result.adminOverride).toBe(true);
    expect(result.previousAssignedTo).toBe(99);
  });

  it('não marca adminOverride quando o próprio admin já é o responsável (idempotente)', async () => {
    const count = { id: 6, status: 'draft', assigned_to: 33 };
    const repository = buildStartRepository(count);
    const useCase = new StartInventoryCountUseCase(repository);

    const result = await useCase.execute({ id: 6, userId: 33, role: 'admin' });

    expect(result.adminOverride).toBe(false);
    const updateCallData = repository.update.mock.calls[0][1];
    expect(updateCallData).not.toHaveProperty('assigned_to');
  });
});

describe('ReassignInventoryCountUseCase — reatribuição por gestor (achado de auditoria 2026-08-06, item 1a)', () => {
  function buildReassignRepository(count: any, overrides: Record<string, any> = {}) {
    return {
      findRawByIdForUpdate: jest.fn(async () => count),
      update: jest.fn(async () => 1),
      findById: jest.fn(async () => ({ ...count, assigned_to: overrides.newAssignedTo ?? count.assigned_to })),
      findActiveUserById: jest.fn(async (id: number) => ({ id, active: true })),
      ...overrides.repository,
    };
  }

  it('reatribui contagem em draft para outro funcionário (gestor)', async () => {
    const count = { id: 10, status: 'draft', assigned_to: 5 };
    const repository = buildReassignRepository(count, { newAssignedTo: 42 });
    const useCase = new ReassignInventoryCountUseCase(repository);

    const { count: updated, previousAssignedTo } = await useCase.execute({ id: 10, assigned_to: 42 });

    expect(repository.update).toHaveBeenCalledWith(10, { assigned_to: 42 }, expect.anything());
    expect(previousAssignedTo).toBe(5);
    expect(updated.assigned_to).toBe(42);
  });

  it('reatribui contagem em counting para null (devolve ao pool)', async () => {
    const count = { id: 11, status: 'counting', assigned_to: 5 };
    const repository = buildReassignRepository(count, { newAssignedTo: null });
    const useCase = new ReassignInventoryCountUseCase(repository);

    const { previousAssignedTo } = await useCase.execute({ id: 11, assigned_to: null });

    expect(repository.update).toHaveBeenCalledWith(11, { assigned_to: null }, expect.anything());
    expect(previousAssignedTo).toBe(5);
    // Não deve validar usuário quando o destino é o pool (null).
    expect(repository.findActiveUserById).not.toHaveBeenCalled();
  });

  it('rejeita reatribuição de contagem em status inválido (422/BusinessRuleError, com details didático)', async () => {
    const count = { id: 12, status: 'pending_approval', assigned_to: 5 };
    const repository = buildReassignRepository(count);
    const useCase = new ReassignInventoryCountUseCase(repository);

    await expect(useCase.execute({ id: 12, assigned_to: 42 })).rejects.toMatchObject({
      statusCode: 422,
      details: { current_status: 'pending_approval', allowed_statuses: ['draft', 'counting'] },
    });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejeita reatribuição para usuário inexistente/inativo (422/ValidationError, sem side-effect)', async () => {
    const count = { id: 13, status: 'draft', assigned_to: 5 };
    const repository = buildReassignRepository(count);
    repository.findActiveUserById = jest.fn(async () => null);
    const useCase = new ReassignInventoryCountUseCase(repository);

    await expect(useCase.execute({ id: 13, assigned_to: 999 })).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('não encontrado ou inativo'),
    });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('lança NotFoundError (404) quando a contagem não existe', async () => {
    const repository = buildReassignRepository(null);
    const useCase = new ReassignInventoryCountUseCase(repository);

    await expect(useCase.execute({ id: 999, assigned_to: 42 })).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.update).not.toHaveBeenCalled();
  });
});

describe('ListInventoryCountsUseCase — filtros assigned_to / unassigned (pool)', () => {
  function buildListRepository() {
    return {
      list: jest.fn(async () => ({ rows: [], count: 0 })),
    };
  }

  it('repassa assigned_to numérico ao repositório (ex.: atalho "me" já resolvido pelo controller)', async () => {
    const repository = buildListRepository();
    const useCase = new ListInventoryCountsUseCase(repository);

    await useCase.execute({ assigned_to: '33' });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to: 33 }),
      expect.anything()
    );
    const filtersArg = repository.list.mock.calls[0][0];
    expect(filtersArg).not.toHaveProperty('unassigned');
  });

  it('repassa unassigned=true ao repositório (pool), ignorando assigned_to se ambos vierem informados', async () => {
    const repository = buildListRepository();
    const useCase = new ListInventoryCountsUseCase(repository);

    await useCase.execute({ status: 'draft', unassigned: 'true', assigned_to: '33' });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', unassigned: true }),
      expect.anything()
    );
    const filtersArg = repository.list.mock.calls[0][0];
    expect(filtersArg).not.toHaveProperty('assigned_to');
  });

  it('nao aplica nenhum filtro de atribuicao quando nem assigned_to nem unassigned sao informados (mantem contrato pre-existente)', async () => {
    const repository = buildListRepository();
    const useCase = new ListInventoryCountsUseCase(repository);

    await useCase.execute({ status: 'draft', count_type: 'cycle' });

    const filtersArg = repository.list.mock.calls[0][0];
    expect(filtersArg).toEqual({ status: 'draft', count_type: 'cycle' });
  });
});
