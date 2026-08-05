jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import CreateItemStructureUseCase = require('../../src/modules/items/application/use-cases/CreateItemStructureUseCase');
import ExplodeItemStructureUseCase = require('../../src/modules/items/application/use-cases/ExplodeItemStructureUseCase');
import UpdateItemUseCase = require('../../src/modules/items/application/use-cases/UpdateItemUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';
const { updateItemSchema } = require('../../src/modules/items/presentation/validators/itemValidators');

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

describe('UpdateItemUseCase — toggle de conversao_automatica via API', () => {
  it('liga a flag conversao_automatica quando enviada no payload', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({ id, conversao_automatica: false })),
      update: jest.fn(async (id: string, data: Record<string, unknown>) => ({ id, conversao_automatica: false, ...data })),
    };

    const useCase = new UpdateItemUseCase(itemRepository as any);
    const result = await useCase.execute({ itemId: 'item-1', data: { conversao_automatica: true } });

    expect(itemRepository.update).toHaveBeenCalledWith('item-1', { conversao_automatica: true });
    expect(result.conversao_automatica).toBe(true);
  });

  it('nao altera o valor existente quando o campo nao e enviado no payload', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({ id, conversao_automatica: true, descricao: 'Woofer 12"' })),
      update: jest.fn(async (id: string, data: Record<string, unknown>) => ({ id, conversao_automatica: true, descricao: 'Woofer 12" atualizado', ...data })),
    };

    const useCase = new UpdateItemUseCase(itemRepository as any);
    const result = await useCase.execute({ itemId: 'item-2', data: { descricao: 'Woofer 12" atualizado' } });

    expect(itemRepository.update).toHaveBeenCalledWith('item-2', { descricao: 'Woofer 12" atualizado' });
    expect(result.conversao_automatica).toBe(true);
  });

  it('lanca NotFoundError se o item nao existir', async () => {
    const itemRepository = {
      findById: jest.fn(async () => null),
      update: jest.fn(),
    };

    const useCase = new UpdateItemUseCase(itemRepository as any);

    await expect(useCase.execute({ itemId: 'inexistente', data: { conversao_automatica: true } }))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(itemRepository.update).not.toHaveBeenCalled();
  });
});

describe('updateItemSchema — validacao do payload de PATCH /api/items/:id', () => {
  it('aceita conversao_automatica como boolean opcional', () => {
    expect(updateItemSchema.parse({ conversao_automatica: true })).toEqual({ conversao_automatica: true });
    expect(updateItemSchema.parse({})).toEqual({});
  });

  it('rejeita campos desconhecidos (schema estrito)', () => {
    expect(() => updateItemSchema.parse({ codigo: 'NAO-PERMITIDO' })).toThrow();
  });

  it('rejeita conversao_automatica com tipo invalido', () => {
    expect(() => updateItemSchema.parse({ conversao_automatica: 'true' })).toThrow();
  });
});
