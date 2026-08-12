import MrpRepository from '../../domain/repositories/MrpRepository';
const { MrpOrdemPlanejada, Item } = require('../../../../models/index');
const { Op } = require('sequelize');
// G1 (2026-08-10): o MRP deixou de ler `item_estruturas`. Planejamento e
// consumo passam a ler a MESMA estrutura — ver `bomStructureProjection`.
const BomStructureProjection = require('../../../../services/bomStructureProjection');

class SequelizeMrpRepository extends MrpRepository {
  /**
   * Arestas da estrutura vigente, projetadas em UUID de item.
   *
   * **Mudou no G1 (2026-08-10).** Até aqui esta consulta lia
   * `item_estruturas` — uma segunda árvore de produto, com mestre e chave
   * diferentes da que a produção realmente consome e custeia
   * (`bill_of_materials`). O planejamento comprava contra uma árvore e o
   * chão de fábrica consumia contra outra, sem nada reconciliando as duas.
   * Agora a fonte é única: a BOM ativa, projetada para UUID pelo crosswalk
   * `products.code = items.codigo` que o resto do ERP já usa.
   *
   * @returns Arestas pai→componente da BOM ativa.
   */
  public async listActiveEdges(): Promise<any[]> {
    return BomStructureProjection.listActiveEdges();
  }

  /**
   * Arestas de BOM ativa que o MRP **não consegue enxergar** porque o
   * produto não tem item canônico correspondente (`products.code` sem
   * `items.codigo`).
   *
   * Existe para que o buraco do crosswalk seja visível em vez de virar
   * planejamento silenciosamente incompleto — que é exatamente o defeito
   * que o G1 fecha.
   *
   * @returns Lista de lacunas de catálogo (vazia quando a projeção é total).
   */
  public async listStructureGaps(): Promise<any[]> {
    const { unmapped } = await BomStructureProjection.listActiveStructure();
    return unmapped;
  }

  /**
   * Grava as ordens planejadas de uma rodada do MRP, criando as novas e
   * recalculando as que ja existiam (mesma chave `uq_mrp_sem_duplicidade`:
   * item + origem + origem_id + data de necessidade).
   *
   * **`status` fica de fora do UPDATE** (correcao do defeito CRITICO 2 da
   * auditoria de 2026-08-11). O plano e sempre montado com
   * `status: 'RASCUNHO'` — e ele nao e um dado recalculado, e uma **maquina
   * de estados**: quem move a ordem para `EM_EXECUCAO` e a conversao em
   * requisicao/OP. Enquanto o payload inteiro era aplicado, cada rodada do
   * MRP (rotina diaria do planejador) rebaixava ordens ja convertidas de
   * volta para `RASCUNHO`, elas voltavam a satisfazer
   * `AUTO_CONVERTIBLE_STATUSES` e **eram convertidas de novo**: uma
   * requisicao de compra nova por rodada, para o mesmo material.
   *
   * O status de linha NOVA continua vindo do payload, via `defaults`.
   *
   * @param orders - Linhas do plano (uma por item x origem x data).
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Ordens planejadas persistidas, na ordem de entrada.
   */
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
        const { status: _recalculatedStatus, ...recalculatedFields } = order;
        await record.update(recalculatedFields, transaction ? { transaction } : undefined);
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
