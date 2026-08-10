jest.mock('../../src/models/index', () => {
  const Item = {
    findAll: jest.fn(),
  };

  const Product = {
    findAll: jest.fn(),
  };

  // G7 (2026-08-10): a posicao de estoque do MRP passou a descontar o
  // material retido em quarentena/bloqueio (`lot_controls`).
  const LotControl = {
    findAll: jest.fn(async () => []),
  };

  return { Item, Product, LotControl };
});

import SequelizeItemRepository = require('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository');

const { Item, Product, LotControl } = require('../../src/models/index');

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
        id: 501,
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
        estoque_fisico: '12',
        estoque_retido_qualidade: 0,
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
        estoque_fisico: '5',
        estoque_retido_qualidade: 0,
        estoque_reservado: '2',
        estoque_seguranca: '1',
        lote_minimo: '4',
        lead_time_dias: 8,
      },
    ]);
  });

  // ---------------------------------------------------------------------
  // G7 (achado colateral, 2026-08-10) — a quarentena deixou de ser
  // decorativa para o MRP.
  // ---------------------------------------------------------------------

  it('G7: desconta do estoque do MRP o saldo retido em quarentena/bloqueio', async () => {
    Item.findAll.mockResolvedValue([
      {
        id: 'item-3',
        codigo: 'SKU-003',
        descricao: 'Insumo recebido e nao inspecionado',
        estoque_atual: '0',
        estoque_reservado: '0',
        estoque_seguranca: '0',
        lote_minimo: '0',
        lead_time_dias: 3,
      },
    ]);

    Product.findAll.mockResolvedValue([
      { id: 503, code: 'SKU-003', quantity: '100', reserved_quantity: '0', min_quantity: '0', lead_time: 3 },
    ]);

    // 40 unidades fisicamente no deposito, porem ainda em quarentena.
    LotControl.findAll.mockResolvedValue([{ product_id: 503, withheld_quantity: '40' }]);

    const repository = new SequelizeItemRepository();
    const [position] = await repository.listMrpInventoryPositions(['item-3']);

    // O MRP planeja sobre 60, nao sobre 100 — antes do G7 via 100 e comprava
    // de menos.
    expect(position.estoque_atual).toBe(60);
    expect(position.estoque_fisico).toBe('100');
    expect(position.estoque_retido_qualidade).toBe(40);
  });

  it('G7: retencao maior que o saldo fisico (drift de dado) nunca produz disponibilidade negativa', async () => {
    Item.findAll.mockResolvedValue([
      {
        id: 'item-4',
        codigo: 'SKU-004',
        descricao: 'Item com drift entre lote e saldo',
        estoque_atual: '0',
        estoque_reservado: '0',
        estoque_seguranca: '0',
        lote_minimo: '0',
        lead_time_dias: 1,
      },
    ]);

    Product.findAll.mockResolvedValue([
      { id: 504, code: 'SKU-004', quantity: '10', reserved_quantity: '0', min_quantity: '0', lead_time: 1 },
    ]);

    LotControl.findAll.mockResolvedValue([{ product_id: 504, withheld_quantity: '999' }]);

    const repository = new SequelizeItemRepository();
    const [position] = await repository.listMrpInventoryPositions(['item-4']);

    expect(position.estoque_atual).toBe(0);
  });
});

