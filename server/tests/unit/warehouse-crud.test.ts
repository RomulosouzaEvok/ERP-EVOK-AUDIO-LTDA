/**
 * Test: CRUD de Depositos (docs/governance/TODO.md, Bloco 4.2/4.3)
 *
 * Cobre `CreateWarehouseUseCase`/`UpdateWarehouseUseCase` (criação e edição
 * de depósitos) e o filtro `warehouse_id` de
 * `GET /api/inventory/movements` (`ListInventoryMovementsUseCase` /
 * `SequelizeInventoryRepository.listMovements`).
 *
 * @group unit
 * @ticket Bloco-4.2-4.3
 */

describe('CreateWarehouseUseCase', () => {
  let Warehouse: any;
  let CreateWarehouseUseCase: any;
  let ValidationError: any;
  let ConflictError: any;

  beforeEach(() => {
    jest.resetModules();

    const rows: Record<string, any> = {
      INSUMOS: { id: 1, code: 'INSUMOS', name: 'Deposito INSUMOS', description: null, active: true },
    };

    Warehouse = {
      findOne: jest.fn(async ({ where }: any) => rows[where.code] || null),
      create: jest.fn(async (data: any) => {
        const row = { id: 99, ...data };
        rows[row.code] = row;
        return row;
      }),
    };

    jest.doMock('../../src/models/index', () => ({ Warehouse }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CreateWarehouseUseCase = require('../../src/modules/inventory/application/use-cases/CreateWarehouseUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ ValidationError, ConflictError } = require('../../src/errors'));
  });

  it('cria deposito com sucesso, normalizando code para uppercase', async () => {
    const useCase = new CreateWarehouseUseCase();
    const warehouse = await useCase.execute({ code: 'expedicao', name: 'Deposito Expedicao' });

    expect(warehouse.id).toBe(99);
    expect(Warehouse.create).toHaveBeenCalledWith({
      code: 'EXPEDICAO',
      name: 'Deposito Expedicao',
      description: null,
      active: true,
    });
  });

  it('rejeita code duplicado (case-insensitive) com ConflictError', async () => {
    const useCase = new CreateWarehouseUseCase();

    await expect(
      useCase.execute({ code: 'insumos', name: 'Outro nome' })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(Warehouse.create).not.toHaveBeenCalled();
  });

  it('rejeita code ausente/vazio com ValidationError', async () => {
    const useCase = new CreateWarehouseUseCase();

    await expect(
      useCase.execute({ code: '', name: 'Deposito sem codigo' })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      useCase.execute({ code: '   ', name: 'Deposito sem codigo' } as any)
    ).rejects.toBeInstanceOf(ValidationError);

    expect(Warehouse.create).not.toHaveBeenCalled();
  });

  it('rejeita name ausente/vazio com ValidationError', async () => {
    const useCase = new CreateWarehouseUseCase();

    await expect(
      useCase.execute({ code: 'NOVO', name: '' })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(Warehouse.create).not.toHaveBeenCalled();
  });
});

describe('UpdateWarehouseUseCase', () => {
  let Warehouse: any;
  let UpdateWarehouseUseCase: any;
  let NotFoundError: any;
  let warehouseRow: any;

  beforeEach(() => {
    jest.resetModules();

    warehouseRow = {
      id: 1,
      code: 'INSUMOS',
      name: 'Deposito Insumos',
      description: 'Descricao original',
      active: true,
      update: jest.fn(async function (this: any, values: any) {
        Object.assign(this, values);
        return this;
      }),
    };

    Warehouse = {
      findByPk: jest.fn(async (id: number) => (Number(id) === 1 ? warehouseRow : null)),
    };

    jest.doMock('../../src/models/index', () => ({ Warehouse }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    UpdateWarehouseUseCase = require('../../src/modules/inventory/application/use-cases/UpdateWarehouseUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ NotFoundError } = require('../../src/errors'));
  });

  it('edita name/description/active de um deposito existente', async () => {
    const useCase = new UpdateWarehouseUseCase();
    const { before, warehouse } = await useCase.execute({
      id: 1,
      name: 'Deposito Insumos Renomeado',
      description: 'Nova descricao',
      active: false,
    });

    expect(before).toEqual({ name: 'Deposito Insumos', description: 'Descricao original', active: true });
    expect(warehouse.name).toBe('Deposito Insumos Renomeado');
    expect(warehouse.description).toBe('Nova descricao');
    expect(warehouse.active).toBe(false);
    expect(warehouseRow.update).toHaveBeenCalledWith({
      name: 'Deposito Insumos Renomeado',
      description: 'Nova descricao',
      active: false,
    });
  });

  it('lanca NotFoundError (404) para id inexistente', async () => {
    const useCase = new UpdateWarehouseUseCase();

    await expect(
      useCase.execute({ id: 999, name: 'Qualquer' })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(warehouseRow.update).not.toHaveBeenCalled();
  });

  it('nunca altera o code, mesmo que nao seja passado no input (nao existe campo para isso)', async () => {
    const useCase = new UpdateWarehouseUseCase();
    const { warehouse } = await useCase.execute({ id: 1, name: 'Novo nome' });

    // O use case nunca inclui "code" no objeto de updates enviado ao model.
    expect(warehouseRow.update).toHaveBeenCalledWith({ name: 'Novo nome' });
    expect(warehouse.code).toBe('INSUMOS');
  });
});

describe('idParamSchema (validacao do :id de PUT /api/inventory/warehouses/:id)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { idParamSchema } = require('../../src/modules/inventory/presentation/validators/inventoryValidators');

  it('aceita id numerico positivo (string ou number) e converte para number', () => {
    expect(idParamSchema.parse('1')).toBe(1);
    expect(idParamSchema.parse(42)).toBe(42);
  });

  it('rejeita id nao numerico, zero, negativo ou decimal', () => {
    expect(idParamSchema.safeParse('abc').success).toBe(false);
    expect(idParamSchema.safeParse('0').success).toBe(false);
    expect(idParamSchema.safeParse('-1').success).toBe(false);
    expect(idParamSchema.safeParse('1.5').success).toBe(false);
    expect(idParamSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('GET /api/inventory/movements — filtro warehouse_id (ListInventoryMovementsUseCase)', () => {
  let InventoryMovement: any;
  let ListInventoryMovementsUseCase: any;
  let SequelizeInventoryRepository: any;
  let repository: any;

  const allRows = [
    { id: 1, product_id: 10, warehouse_id: 1, type: 'in' },
    { id: 2, product_id: 10, warehouse_id: 2, type: 'out' },
    { id: 3, product_id: 11, warehouse_id: 1, type: 'in' },
  ];

  beforeEach(() => {
    jest.resetModules();

    InventoryMovement = {
      findAndCountAll: jest.fn(async ({ where }: any) => {
        const filtered = allRows.filter((row) => (where.warehouse_id ? row.warehouse_id === where.warehouse_id : true));
        return { rows: filtered, count: filtered.length };
      }),
    };

    jest.doMock('../../src/models/index', () => ({
      InventoryMovement,
      Product: {},
      User: {},
      Category: {},
      Item: {},
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SequelizeInventoryRepository = require('../../src/modules/inventory/infrastructure/sequelize/SequelizeInventoryRepository');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ListInventoryMovementsUseCase = require('../../src/modules/inventory/application/use-cases/ListInventoryMovementsUseCase');

    repository = new SequelizeInventoryRepository();
  });

  it('sem warehouse_id retorna todas as movimentacoes (comportamento atual preservado)', async () => {
    const useCase = new ListInventoryMovementsUseCase(repository);
    const { rows, count } = await useCase.execute({ limit: 10, offset: 0, page: 1 });

    expect(count).toBe(3);
    expect(rows).toHaveLength(3);
    expect(InventoryMovement.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ warehouse_id: expect.anything() }) })
    );
  });

  it('com warehouse_id retorna apenas as movimentacoes daquele deposito', async () => {
    const useCase = new ListInventoryMovementsUseCase(repository);
    const { rows, count } = await useCase.execute({ warehouse_id: 1, limit: 10, offset: 0, page: 1 });

    expect(count).toBe(2);
    expect(rows.every((row: any) => row.warehouse_id === 1)).toBe(true);
    expect(InventoryMovement.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ warehouse_id: 1 }) })
    );
  });
});
