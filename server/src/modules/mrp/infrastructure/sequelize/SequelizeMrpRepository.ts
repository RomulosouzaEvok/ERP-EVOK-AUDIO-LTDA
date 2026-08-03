import MrpRepository from '../../domain/repositories/MrpRepository';
const { ItemEstrutura, MrpOrdemPlanejada, Item } = require('../../../../models/index');
const { Op } = require('sequelize');

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

  /**
   * Busca ordens planejadas por ids com lock pessimista (`SELECT ... FOR UPDATE`)
   * para evitar condicoes de corrida ao converter em requisicao de compra.
   *
   * @param ids - Ids (UUID) das ordens planejadas.
   * @param transaction - Transacao Sequelize ativa (obrigatoria para o lock).
   * @returns Ordens planejadas encontradas.
   */
  public async findPlannedOrdersByIdsForUpdate(ids: string[], transaction: any): Promise<any[]> {
    return MrpOrdemPlanejada.findAll({
      where: { id: { [Op.in]: ids } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  /**
   * Atualiza o status de um lote de ordens planejadas.
   *
   * @param ids - Ids (UUID) das ordens planejadas.
   * @param status - Novo status (enum `OrdemStatus`).
   * @param transaction - Transacao Sequelize ativa.
   */
  public async updatePlannedOrdersStatus(ids: string[], status: string, transaction: any): Promise<void> {
    await MrpOrdemPlanejada.update(
      { status },
      { where: { id: { [Op.in]: ids } }, transaction },
    );
  }
}

export = SequelizeMrpRepository;
