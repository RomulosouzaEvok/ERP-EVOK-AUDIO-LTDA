/**
 * Testes de regressão do dual-read `product_id` (legado) / `item_id` (novo)
 * em `GET /api/inventory/movements` e `POST /api/inventory/movements`.
 *
 * Cobre dois bugs reais encontrados durante a ativação do TypeScript strict
 * mode (ver `docs/governance/HANDOFF_CODEX.md`):
 *
 * 1. `ListInventoryMovementsUseCase.execute` recebia `item_id` no input mas
 *    nunca o repassava a `inventoryRepository.listMovements` — o filtro era
 *    silenciosamente ignorado.
 * 2. `createInventoryMovementSchema` (Zod, `.strict()`) não declarava
 *    `item_id` no shape, então qualquer `POST` com `item_id` no body era
 *    rejeitado com 400 antes mesmo de chegar ao use case — apesar do
 *    comentário do controller afirmar suporte a `item_id` (dual-read).
 *
 * @group unit
 */

import ListInventoryMovementsUseCase = require('../../src/modules/inventory/application/use-cases/ListInventoryMovementsUseCase');

describe('ListInventoryMovementsUseCase — dual-read item_id', () => {
  it('repassa item_id para inventoryRepository.listMovements quando presente', async () => {
    const inventoryRepository = {
      listMovements: jest.fn(async () => ({ rows: [], count: 0 })),
    };

    const useCase = new ListInventoryMovementsUseCase(inventoryRepository as any);

    await useCase.execute({
      item_id: 'a1b2c3d4-0000-0000-0000-000000000001',
      limit: 10,
      offset: 0,
      page: 1,
    });

    expect(inventoryRepository.listMovements).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: 'a1b2c3d4-0000-0000-0000-000000000001' }),
      { limit: 10, offset: 0 }
    );
  });

  it('mantém o comportamento legado: repassa product_id quando item_id está ausente', async () => {
    const inventoryRepository = {
      listMovements: jest.fn(async () => ({ rows: [], count: 0 })),
    };

    const useCase = new ListInventoryMovementsUseCase(inventoryRepository as any);

    await useCase.execute({
      product_id: 42,
      limit: 10,
      offset: 0,
      page: 1,
    });

    expect(inventoryRepository.listMovements).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 42, item_id: undefined }),
      { limit: 10, offset: 0 }
    );
  });
});

describe('POST /api/inventory/movements — validação Zod dual-read (item_id x product_id)', () => {
  // Requerido depois de jest.resetModules() em cada teste para garantir um
  // schema "limpo", sem qualquer estado global entre casos.
  let createInventoryMovementSchema: any;

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ createInventoryMovementSchema } = require('../../src/modules/inventory/presentation/validators/inventoryValidators'));
  });

  const basePayload = {
    type: 'in',
    quantity: 5,
    description: 'Ajuste de teste',
  };

  it('aceita item_id sozinho (novo, preferido)', () => {
    const result = createInventoryMovementSchema.safeParse({
      ...basePayload,
      item_id: 'a1b2c3d4-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('aceita product_id sozinho (legado)', () => {
    const result = createInventoryMovementSchema.safeParse({
      ...basePayload,
      product_id: 42,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita quando nenhum dos dois é informado', () => {
    const result = createInventoryMovementSchema.safeParse({ ...basePayload });
    expect(result.success).toBe(false);
  });

  it('rejeita quando os dois são informados simultaneamente', () => {
    const result = createInventoryMovementSchema.safeParse({
      ...basePayload,
      product_id: 42,
      item_id: 'a1b2c3d4-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateInventoryMovementUseCase — resolução item_id -> product_id (crosswalk por código)', () => {
  const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

  function loadUseCaseWithMocks(options: {
    legacyProduct: any;
    adjustResult?: any;
  }) {
    jest.resetModules();

    const findLegacyProductByItemId = jest.fn(async () => options.legacyProduct);
    jest.doMock(
      '../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository',
      () =>
        jest.fn().mockImplementation(() => ({
          findLegacyProductByItemId,
        }))
    );

    const adjust = jest.fn(async () => options.adjustResult ?? { success: true, productId: 99, movementId: 501 });
    jest.doMock('../../src/services/inventoryService', () => ({ adjust }));

    const getWarehouseByCode = jest.fn(async () => ({ id: 1, code: 'INSUMOS' }));
    const addToWarehouse = jest.fn(async () => ({}));
    const removeFromWarehouse = jest.fn(async () => ({}));
    jest.doMock('../../src/services/warehouseStockService', () => ({
      getWarehouseByCode,
      addToWarehouse,
      removeFromWarehouse,
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const CreateInventoryMovementUseCase = require('../../src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase');
    // Requerido DEPOIS do `jest.resetModules()` acima — instanciar
    // `BusinessRuleError` do MESMO registro de módulos usado pelo use case
    // recém-carregado, evitando falso-negativo de `instanceof` por
    // identidade de classe divergente entre registros de módulo distintos.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BusinessRuleError } = require('../../src/errors');

    return { CreateInventoryMovementUseCase, BusinessRuleError, findLegacyProductByItemId, adjust, getWarehouseByCode, addToWarehouse };
  }

  it('resolve item_id para o product_id legado (por código) e segue o fluxo normal de InventoryService.adjust', async () => {
    const { CreateInventoryMovementUseCase, findLegacyProductByItemId, adjust } = loadUseCaseWithMocks({
      legacyProduct: { id: 99, code: 'DRV-6', name: 'Driver 6"', status: 'active' },
    });

    const useCase = new CreateInventoryMovementUseCase();
    await useCase.execute({
      item_id: 'a1b2c3d4-0000-0000-0000-000000000001',
      type: 'in',
      quantity: 5,
      description: 'Entrada via item novo',
      userId: 1,
      transaction,
    });

    expect(findLegacyProductByItemId).toHaveBeenCalledWith('a1b2c3d4-0000-0000-0000-000000000001');
    // product_id resolvido (99) chega até InventoryService.adjust, e o
    // item_id original é gravado no InventoryMovement para rastreabilidade.
    expect(adjust).toHaveBeenCalledWith(
      99,
      'in',
      5,
      1,
      'Entrada via item novo',
      transaction,
      1,
      'a1b2c3d4-0000-0000-0000-000000000001'
    );
  });

  it('rejeita com BusinessRuleError (422) quando o item não tem produto legado correspondente', async () => {
    const { CreateInventoryMovementUseCase, BusinessRuleError, adjust } = loadUseCaseWithMocks({ legacyProduct: null });

    const useCase = new CreateInventoryMovementUseCase();

    await expect(
      useCase.execute({
        item_id: 'a1b2c3d4-0000-0000-0000-000000000002',
        type: 'in',
        quantity: 5,
        description: 'Item sem vinculo legado',
        userId: 1,
        transaction,
      })
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(adjust).not.toHaveBeenCalled();
  });

  it('mantém o fluxo legado inalterado quando apenas product_id é informado (item_id null passado ao adjust)', async () => {
    const { CreateInventoryMovementUseCase, findLegacyProductByItemId, adjust } = loadUseCaseWithMocks({
      legacyProduct: null,
    });

    const useCase = new CreateInventoryMovementUseCase();
    await useCase.execute({
      product_id: 42,
      type: 'out',
      quantity: 2,
      description: 'Saida legada',
      userId: 7,
      transaction,
    });

    expect(findLegacyProductByItemId).not.toHaveBeenCalled();
    expect(adjust).toHaveBeenCalledWith(42, 'out', 2, 7, 'Saida legada', transaction, 1, null);
  });
});
