jest.mock('../../src/models/index', () => ({
  Product: { findAll: jest.fn(), count: jest.fn() },
  Sale: {},
  Purchase: {},
  InventoryMovement: { findAll: jest.fn() },
  AccountReceivable: {},
  AccountPayable: {},
}));
jest.mock('../../src/config/database', () => ({
  sequelize: {
    fn: jest.fn((name: string, col: unknown) => ({ fn: name, col })),
    col: jest.fn((name: string) => ({ col: name })),
  },
}));

const { Product, InventoryMovement } = require('../../src/models/index');
import SequelizeIntelligentAuditorRepository = require('../../src/modules/intelligentAuditor/infrastructure/sequelize/SequelizeIntelligentAuditorRepository');

describe('SequelizeIntelligentAuditorRepository.auditStock — regressao N+1 (achado de auditoria)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('consulta produtos SEM movimentacao com UMA UNICA query agregada, nao uma query por produto', async () => {
    Product.findAll
      .mockResolvedValueOnce([]) // negative_stock
      .mockResolvedValueOnce([
        { id: 1, name: 'A', code: 'A1', quantity: 10 },
        { id: 2, name: 'B', code: 'B1', quantity: 5 },
        { id: 3, name: 'C', code: 'C1', quantity: 3 },
      ]); // positiveStock
    Product.count.mockResolvedValue(3);

    // Apenas o produto 2 tem movimentacao registrada.
    InventoryMovement.findAll.mockResolvedValue([{ product_id: 2 }]);

    const repository = new SequelizeIntelligentAuditorRepository();
    const result = await repository.auditStock();

    // UMA UNICA chamada a InventoryMovement.findAll (agregada), nao uma
    // por produto do estoque positivo (o bug original chamava findOne
    // dentro de um loop, N chamadas para N produtos).
    expect(InventoryMovement.findAll).toHaveBeenCalledTimes(1);

    expect(result.no_movement.map((p: any) => p.id)).toEqual([1, 3]);
    expect(result.summary.total_no_movement).toBe(2);
  });

  it('nao lista produto com movimentacao registrada como sem movimentacao', async () => {
    Product.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 5, name: 'X', code: 'X1', quantity: 1 }]);
    Product.count.mockResolvedValue(1);
    InventoryMovement.findAll.mockResolvedValue([{ product_id: 5 }]);

    const repository = new SequelizeIntelligentAuditorRepository();
    const result = await repository.auditStock();

    expect(result.no_movement).toEqual([]);
  });
});
