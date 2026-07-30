jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import CreateItemStructureUseCase = require('../../src/modules/items/application/use-cases/CreateItemStructureUseCase');
import ExplodeItemStructureUseCase = require('../../src/modules/items/application/use-cases/ExplodeItemStructureUseCase');
import { BusinessRuleError } from '../../src/errors';

describe('Use cases de itens canonicos', () => {
  it('bloqueia ciclo ao criar estrutura de item', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({ id })),
    };
    const itemEstruturaRepository = {
      hasPathBetween: jest.fn(async () => true),
      create: jest.fn(),
      listActiveEdges: jest.fn(),
    };

    const useCase = new CreateItemStructureUseCase(itemRepository as any, itemEstruturaRepository as any);

    await expect(useCase.execute({
      item_pai_id: 'a',
      item_componente_id: 'b',
      quantidade: 1,
    })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(itemEstruturaRepository.create).not.toHaveBeenCalled();
  });

  it('explode estrutura ativa agregando componentes repetidos', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({ id, codigo: id.toUpperCase(), descricao: `Item ${id}` })),
    };
    const itemEstruturaRepository = {
      listActiveEdges: jest.fn(async () => [
        { item_pai_id: 'PA', item_componente_id: 'SUB', quantidade: 2, perda_percentual: 0, ativo: true },
        { item_pai_id: 'SUB', item_componente_id: 'MP', quantidade: 1, perda_percentual: 0, ativo: true },
        { item_pai_id: 'PA', item_componente_id: 'MP', quantidade: 1, perda_percentual: 0, ativo: true },
      ]),
    };

    const useCase = new ExplodeItemStructureUseCase(itemRepository as any, itemEstruturaRepository as any);
    const result = await useCase.execute({ itemId: 'PA', quantity: 2, dueDate: '2026-08-10' });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ item_id: 'SUB', quantidade_bruta: 4 }),
      expect.objectContaining({ item_id: 'MP', quantidade_bruta: 6 }),
    ]));
  });
});
