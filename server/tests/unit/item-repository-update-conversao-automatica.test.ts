/**
 * Cobertura do toggle de `conversao_automatica` via API de item:
 * - `SequelizeItemRepository.update` propaga o campo ao Sequelize sem filtro.
 * - `SequelizeItemRepository.findById` (usado pelo GET /api/items/:id) retorna
 *   o campo atual, pois nao ha `attributes` restringindo a query.
 */
jest.mock('../../src/models/index', () => {
  const Item = {
    findByPk: jest.fn(),
  };

  const Product = {};

  return { Item, Product };
});

import SequelizeItemRepository = require('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository');

const { Item } = require('../../src/models/index');

describe('SequelizeItemRepository — conversao_automatica (toggle via PATCH /api/items/:id)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('update() propaga conversao_automatica=true ao model Item sem filtrar o campo', async () => {
    const update = jest.fn(async (data: Record<string, unknown>) => ({ id: 'item-1', conversao_automatica: true, ...data }));
    Item.findByPk.mockResolvedValue({ id: 'item-1', conversao_automatica: false, update });

    const repository = new SequelizeItemRepository();
    const result = await repository.update('item-1', { conversao_automatica: true });

    expect(update).toHaveBeenCalledWith({ conversao_automatica: true }, undefined);
    expect(result.conversao_automatica).toBe(true);
  });

  it('findById() retorna conversao_automatica no payload (GET /api/items/:id)', async () => {
    Item.findByPk.mockResolvedValue({ id: 'item-1', codigo: 'SKU-001', conversao_automatica: true });

    const repository = new SequelizeItemRepository();
    const item = await repository.findById('item-1');

    expect(item.conversao_automatica).toBe(true);
  });

  it('update() retorna null quando o item nao existe (sem propagar campo indevidamente)', async () => {
    Item.findByPk.mockResolvedValue(null);

    const repository = new SequelizeItemRepository();
    const result = await repository.update('inexistente', { conversao_automatica: true });

    expect(result).toBeNull();
  });
});
