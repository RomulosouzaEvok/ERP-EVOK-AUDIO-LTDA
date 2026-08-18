const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

jest.mock('../../src/config/database', () => ({
  sequelize: { transaction: jest.fn(async () => mockTransaction) },
}));

jest.mock('../../src/services/itemProductMirrorService', () => ({
  ensureProductMirrorForItem: jest.fn(async () => null),
}));

import CreateItemUseCase = require('../../src/modules/items/application/use-cases/CreateItemUseCase');

describe('CASE-006 - CreateItemUseCase zera estoque_reservado no cadastro', () => {
  it('ignora valor livre de estoque_reservado e persiste zero', async () => {
    const itemRepository = {
      findByCode: jest.fn(async () => null),
      create: jest.fn(async (_data: Record<string, unknown>) => ({ id: 'item-1', ..._data })),
    };

    const useCase = new CreateItemUseCase(itemRepository as any);
    const result = await useCase.execute({
      codigo: 'ITEM-RESERVADO-CASE006',
      descricao: 'Item reservado',
      tipo: 'USO_E_CONSUMO',
      unidade: 'UN',
      estoque_reservado: 99,
    });

    expect(itemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estoque_atual: 0,
        estoque_reservado: 0,
      }),
      mockTransaction,
    );
    expect(result.estoque_reservado).toBe(0);
  });
});
