jest.mock('../../src/models/index', () => {
  const Item = {
    findAll: jest.fn(),
  };

  const Product = {
    findAll: jest.fn(),
  };

  return { Item, Product };
});

import SequelizeItemRepository = require('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository');

const { Item, Product } = require('../../src/models/index');

describe('SequelizeItemRepository.listMrpInventoryPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers live Product stock when the canonical Item code matches a Product', async () => {
    Item.findAll.mockResolvedValue([
      {
        id: 'item-1',
        codigo: 'SKU-001',
        descricao: 'Item legado',
        estoque_atual: '2',
        estoque_reservado: '1',
        estoque_seguranca: '0',
        lote_minimo: '1',
        lead_time_dias: 9,
      },
    ]);

    Product.findAll.mockResolvedValue([
      {
        code: 'SKU-001',
        quantity: '12',
        reserved_quantity: '3',
        min_quantity: '7',
        lead_time: 4,
      },
    ]);

    const repository = new SequelizeItemRepository();
    const positions = await repository.listMrpInventoryPositions(['item-1']);

    expect(Item.findAll).toHaveBeenCalledTimes(1);
    expect(Product.findAll).toHaveBeenCalledTimes(1);
    expect(positions).toEqual([
      {
        id: 'item-1',
        codigo: 'SKU-001',
        descricao: 'Item legado',
        estoque_atual: '12',
        estoque_reservado: '3',
        estoque_seguranca: '7',
        lote_minimo: '7',
        lead_time_dias: 4,
      },
    ]);
  });

  it('falls back to Item snapshot when no live Product match exists', async () => {
    Item.findAll.mockResolvedValue([
      {
        id: 'item-2',
        codigo: 'SKU-002',
        descricao: 'Item sem produto',
        estoque_atual: '5',
        estoque_reservado: '2',
        estoque_seguranca: '1',
        lote_minimo: '4',
        lead_time_dias: 8,
      },
    ]);

    Product.findAll.mockResolvedValue([]);

    const repository = new SequelizeItemRepository();
    const positions = await repository.listMrpInventoryPositions(['item-2']);

    expect(positions).toEqual([
      {
        id: 'item-2',
        codigo: 'SKU-002',
        descricao: 'Item sem produto',
        estoque_atual: '5',
        estoque_reservado: '2',
        estoque_seguranca: '1',
        lote_minimo: '4',
        lead_time_dias: 8,
      },
    ]);
  });
});

