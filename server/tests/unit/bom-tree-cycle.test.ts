jest.mock('../../src/models/index', () => ({
  BillOfMaterial: { findByPk: jest.fn() },
  BillOfMaterialItem: {},
  Product: {},
}));

const { BillOfMaterial } = require('../../src/models/index');
import BomService = require('../../src/services/bomService');

describe('BomService.getBOMTree — protecao contra ciclo (achado de auditoria)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('constroi a arvore normalmente para uma BOM sem ciclo', async () => {
    BillOfMaterial.findByPk.mockResolvedValue({
      id: 1,
      items: [
        { id: 10, parent_item_id: null, sequence_order: 1, bom_level: 1, quantity: 2, unit: 'un', scrap_percentage: 0, total_cost: 10, notes: null, component_product_id: 100, componentProduct: null },
        { id: 11, parent_item_id: 10, sequence_order: 1, bom_level: 2, quantity: 1, unit: 'un', scrap_percentage: 0, total_cost: 5, notes: null, component_product_id: 101, componentProduct: null },
      ],
    });

    const result = await BomService.getBOMTree(1);

    expect(result.tree).toHaveLength(1);
    expect(result.tree[0].id).toBe(10);
    expect(result.tree[0].children).toHaveLength(1);
    expect(result.tree[0].children[0].id).toBe(11);
  });

  it('nao trava com um par de itens mutuamente referenciados (fica orfao, sem crash)', async () => {
    // Como cada item tem um unico parent_item_id fixo e ids sao unicos,
    // um par mutuamente referenciado (20<->21) nunca e alcancavel a partir
    // da raiz (null) neste modelo — fica orfao/excluido da arvore, sem
    // recursao infinita. O guard de profundidade/ciclo abaixo e defesa em
    // profundidade para dados corrompidos que consigam formar um caminho
    // realmente alcancavel e ciclico.
    BillOfMaterial.findByPk.mockResolvedValue({
      id: 2,
      items: [
        { id: 20, parent_item_id: 21, sequence_order: 1, bom_level: 1, quantity: 1, unit: 'un', scrap_percentage: 0, total_cost: 1, notes: null, component_product_id: 200, componentProduct: null },
        { id: 21, parent_item_id: 20, sequence_order: 1, bom_level: 1, quantity: 1, unit: 'un', scrap_percentage: 0, total_cost: 1, notes: null, component_product_id: 201, componentProduct: null },
      ],
    });

    const result = await BomService.getBOMTree(2);
    expect(result.tree).toEqual([]);
  });

  it('bloqueia profundidade excessiva mesmo sem ciclo estrito de ids repetidos', async () => {
    const items: any[] = [];
    // Cadeia linear de 15 niveis (> MAX_BOM_DEPTH=10), sem repetir nenhum id.
    for (let i = 0; i < 15; i++) {
      items.push({
        id: i,
        parent_item_id: i === 0 ? null : i - 1,
        sequence_order: 1,
        bom_level: i + 1,
        quantity: 1,
        unit: 'un',
        scrap_percentage: 0,
        total_cost: 1,
        notes: null,
        component_product_id: 300 + i,
        componentProduct: null,
      });
    }
    BillOfMaterial.findByPk.mockResolvedValue({ id: 3, items });

    await expect(BomService.getBOMTree(3)).rejects.toThrow(/profundidade máxima/);
  });
});
