import Item = require('../../src/models/Item');
import ItemEstrutura = require('../../src/models/ItemEstrutura');
import MrpOrdemPlanejada = require('../../src/models/MrpOrdemPlanejada');
import * as models from '../../src/models/index';

describe('Models canonicos industriais', () => {
  it('define campos industriais com DECIMAL(18, 6) e enums corretos', () => {
    expect(Item.rawAttributes.estoque_atual.type.toString()).toContain('DECIMAL');
    expect(Item.rawAttributes.estoque_reservado.type.toString()).toContain('DECIMAL');
    expect(Item.rawAttributes.estoque_seguranca.type.toString()).toContain('DECIMAL');
    expect(Item.rawAttributes.lote_minimo.type.toString()).toContain('DECIMAL');
    expect(Item.rawAttributes.tipo.values).toEqual(['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO']);

    expect(ItemEstrutura.rawAttributes.quantidade.type.toString()).toContain('DECIMAL');
    expect(ItemEstrutura.rawAttributes.perda_percentual.type.toString()).toContain('DECIMAL');
    expect(ItemEstrutura.rawAttributes.item_pai_id.allowNull).toBe(false);
    expect(ItemEstrutura.rawAttributes.item_componente_id.allowNull).toBe(false);

    expect(MrpOrdemPlanejada.rawAttributes.necessidade_bruta.type.toString()).toContain('DECIMAL');
    expect(MrpOrdemPlanejada.rawAttributes.quantidade_planejada.type.toString()).toContain('DECIMAL');
    expect(MrpOrdemPlanejada.rawAttributes.origem.values).toEqual([
      'PEDIDO_VENDA',
      'PREVISAO',
      'ORDEM_PRODUCAO',
      'MANUAL',
    ]);
  });

  it('registra associations canonicas com RESTRICT na estrutura', () => {
    expect(models.Item.associations.estruturas_filhas).toBeDefined();
    expect(models.ItemEstrutura.associations.itemPai.options.onDelete).toBe('RESTRICT');
    expect(models.ItemEstrutura.associations.itemComponente.options.onDelete).toBe('RESTRICT');
    expect(models.MrpOrdemPlanejada.associations.item.options.onDelete).toBe('RESTRICT');
  });
});
