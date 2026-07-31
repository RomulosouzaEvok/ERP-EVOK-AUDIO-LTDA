import MrpRepository from '../../domain/repositories/MrpRepository';
const { ItemEstrutura, MrpOrdemPlanejada, Item } = require('../../../../models/index');

class SequelizeMrpRepository extends MrpRepository {
  public async listActiveEdges(): Promise<any[]> {
    return ItemEstrutura.findAll({
      where: { ativo: true },
      attributes: ['item_pai_id', 'item_componente_id', 'quantidade', 'perda_percentual', 'ativo'],
      raw: true,
    });
  }

  public async upsertPlannedOrders(orders: Record<string, unknown>[], transaction?: any): Promise<any[]> {
    const persisted: any[] = [];

    for (const order of orders) {
      const [record] = await MrpOrdemPlanejada.findOrCreate({
        where: {
          item_id: order.item_id,
          origem: order.origem,
          origem_id: order.origem_id,
          data_necessidade: order.data_necessidade,
        },
        defaults: order,
        ...(transaction ? { transaction } : {}),
      });

      if (!record.isNewRecord) {
        await record.update(order, transaction ? { transaction } : undefined);
      }

      persisted.push(record);
    }

    return persisted;
  }

  public async listPlannedOrders(): Promise<any[]> {
    return MrpOrdemPlanejada.findAll({
      include: [{ model: Item, as: 'item' }],
      order: [['data_liberacao', 'ASC'], ['data_necessidade', 'ASC']],
    });
  }
}

export = SequelizeMrpRepository;
