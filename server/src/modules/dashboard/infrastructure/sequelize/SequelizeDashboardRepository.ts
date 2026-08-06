/**
 * Implementacao Sequelize do repositorio de indicadores do Dashboard.
 *
 * @module modules/dashboard/infrastructure/sequelize/SequelizeDashboardRepository
 */

import DashboardRepository from '../../domain/repositories/DashboardRepository';
const {
  Product,
  Sale,
  Purchase,
  ProductionOrder,
  AccountReceivable,
  AccountPayable,
  Client,
  sequelize
}: any = require('../../../../models/index');
const { Op, col, QueryTypes }: any = require('sequelize');

class SequelizeDashboardRepository extends DashboardRepository {
  /** @inheritdoc */
  public async getSummary(): Promise<any> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const productCount = await Product.count({ where: { status: 'active' } });
    const lowStockCount = await Product.count({
      where: { status: 'active', quantity: { [Op.lte]: col('min_quantity') } }
    });
    const salesMonth =
      (await Sale.sum('total_amount', {
        where: { createdAt: { [Op.gte]: startOfMonth }, status: { [Op.notIn]: ['canceled'] } }
      })) || 0;
    const salesCount = await Sale.count({
      where: { createdAt: { [Op.gte]: startOfMonth }, status: { [Op.notIn]: ['canceled'] } }
    });
    const pq =
      (await Purchase.sum('total_amount', {
        where: { status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] } }
      })) || 0;
    const clientCount = await Client.count({ where: { status: 'active' } });
    const pOrderCount = await ProductionOrder.count({
      where: { status: { [Op.in]: ['planned', 'released', 'in_progress'] } }
    });
    const ar = (await AccountReceivable.sum('amount', { where: { status: 'pending' } })) || 0;
    const ap = (await AccountPayable.sum('amount', { where: { status: 'pending' } })) || 0;

    return {
      products: { total: productCount, low_stock: lowStockCount },
      sales: { month_total: salesMonth, month_count: salesCount },
      purchases: { pending_total: pq },
      clients: { total: clientCount },
      production: { open_orders: pOrderCount },
      financial: { pending_receivable: ar, pending_payable: ap, projected_balance: ar - ap }
    };
  }

  /**
   * Bloco 3.3 (UC-40, docs/governance/TODO.md) — resumo por área do
   * semáforo de handoff. SQL parametrizado leve (sem interpolação de
   * strings de usuário — os únicos parâmetros dinâmicos são listas fixas
   * de status), mesmo padrão de `getCockpitMetrics`
   * (`SequelizePurchaseRepository`).
   *
   * @inheritdoc
   */
  public async getHandoffsSummary(): Promise<any> {
    const [receivingRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_orders
       WHERE status IN (:pendingStatuses)`,
      { replacements: { pendingStatuses: ['sent', 'approved', 'partial'] }, type: QueryTypes.SELECT }
    );

    const [requisitionsRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_requisitions
       WHERE status = :pendingStatus`,
      { replacements: { pendingStatus: 'pending' }, type: QueryTypes.SELECT }
    );

    const [shippingRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM sales
       WHERE status = :invoicedStatus`,
      { replacements: { invoicedStatus: 'invoiced' }, type: QueryTypes.SELECT }
    );

    const [quarantineRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM lot_controls
       WHERE status = :quarantineStatus`,
      { replacements: { quarantineStatus: 'quarantine' }, type: QueryTypes.SELECT }
    );

    const [openRncRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM non_conformities
       WHERE status IN (:openStatuses)`,
      { replacements: { openStatuses: ['open', 'analysis'] }, type: QueryTypes.SELECT }
    );

    // Bloco B (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md): RNCs
    // com `immediate_action = 'return_supplier'` ainda nao encerradas
    // (status fora de closed/canceled) sao item de trabalho pendente na
    // fila de Compras — Qualidade ja decidiu QUE devolver, falta Compras
    // decidir COMO resolver com o fornecedor (credito/reposicao/
    // cancelamento). Contador separado de `qualidade.open_rncs`
    // (RNC pode estar aberta por outro motivo que nao devolucao).
    const [pendingReturnsRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM non_conformities
       WHERE immediate_action = :returnAction
         AND status NOT IN (:closedStatuses)`,
      {
        replacements: { returnAction: 'return_supplier', closedStatuses: ['closed', 'canceled'] },
        type: QueryTypes.SELECT
      }
    );

    return {
      recebimento: { pending: receivingRow?.count ?? 0 },
      requisicoes: { awaiting_approval: requisitionsRow?.count ?? 0 },
      expedicao: { ready_to_ship: shippingRow?.count ?? 0 },
      qualidade: { quarantine: quarantineRow?.count ?? 0, open_rncs: openRncRow?.count ?? 0 },
      compras: { pending_returns: pendingReturnsRow?.count ?? 0 },
    };
  }

  /**
   * Painel de TV (gestores) — demandas em aberto por departamento.
   *
   * 4 queries agregadas (sem N+1): departamentos ativos + as 3 entidades
   * (OPs, requisições de compra, contagens de inventário) já filtradas por
   * status "em aberto" e ordenadas. A junção com departamento é feita em
   * memória (poucas centenas de linhas no máximo, consulta de baixa
   * frequência de um painel de TV — não há necessidade de uma 5ª query com
   * JOIN/GROUP BY no banco).
   *
   * Regras de "em aberto" confirmadas lendo o código (não documentadas
   * antes desta função):
   * - OPs (`production_orders.status`): tudo que não é `completed`/
   *   `canceled` — `planned`, `released`, `in_progress`, `paused`
   *   (`ProductionOrderEntity.STATUS_TRANSITIONS`).
   * - Requisições de compra (`purchase_requisitions.status`): `draft`,
   *   `pending`, `approved` — a partir de `ordered` a requisição já foi
   *   convertida em pedido de compra por
   *   `ConvertRequisitionToPurchaseOrdersUseCase` (deixa de ser uma demanda
   *   pendente do departamento requisitante; quem passa a acompanhar é
   *   Compras/Recebimento, já coberto por `getHandoffsSummary`). Não existe
   *   status `rejected` neste model (apenas `canceled`).
   * - Contagens de inventário (`inventory_counts.status`): `draft`,
   *   `counting`, `pending_approval` (`InventoryCountEntity.COUNT_STATUSES`
   *   menos `approved`/`rejected`/`adjusted`, que já são desfechos).
   *
   * Demandas cujo `department_id` aponta para um departamento INATIVO
   * (`active = false`, mas ainda existente — soft delete, FK não foi
   * anulada) são omitidas do resultado por decisão de design: o painel só
   * lista departamentos ativos + o grupo "Sem departamento"; reativar o
   * departamento volta a exibir as demandas automaticamente.
   *
   * @inheritdoc
   */
  public async getDepartmentDemands(): Promise<any[]> {
    const departments = await sequelize.query(
      `SELECT id, name FROM departments WHERE active = true ORDER BY name ASC`,
      { type: QueryTypes.SELECT }
    );

    const productionOrders = await sequelize.query(
      `SELECT po.id, po.order_number AS reference, po.status, po.due_date, po.department_id,
              p.name AS label
       FROM production_orders po
       LEFT JOIN products p ON p.id = po.product_id
       WHERE po.status IN (:statuses)
       ORDER BY po.due_date ASC NULLS LAST, po.id ASC`,
      { replacements: { statuses: ['planned', 'released', 'in_progress', 'paused'] }, type: QueryTypes.SELECT }
    );

    const purchaseRequisitions = await sequelize.query(
      `SELECT pr.id, pr.requisition_number AS reference, pr.status, pr.request_date AS due_date,
              pr.department_id, pr.priority AS label
       FROM purchase_requisitions pr
       WHERE pr.status IN (:statuses)
       ORDER BY pr.request_date ASC NULLS LAST, pr.id ASC`,
      { replacements: { statuses: ['draft', 'pending', 'approved'] }, type: QueryTypes.SELECT }
    );

    const inventoryCounts = await sequelize.query(
      `SELECT ic.id, ic.count_number AS reference, ic.status, NULL::date AS due_date,
              ic.department_id, ic.count_type AS label
       FROM inventory_counts ic
       WHERE ic.status IN (:statuses)
       ORDER BY ic.created_at ASC, ic.id ASC`,
      { replacements: { statuses: ['draft', 'counting', 'pending_approval'] }, type: QueryTypes.SELECT }
    );

    const groups = new Map<number | null, any>();
    for (const dept of departments as any[]) {
      groups.set(dept.id, {
        department_id: dept.id,
        department_name: dept.name,
        open_production_orders: { count: 0, items: [] },
        open_purchase_requisitions: { count: 0, items: [] },
        open_inventory_counts: { count: 0, items: [] },
      });
    }
    groups.set(null, {
      department_id: null,
      department_name: 'Sem departamento',
      open_production_orders: { count: 0, items: [] },
      open_purchase_requisitions: { count: 0, items: [] },
      open_inventory_counts: { count: 0, items: [] },
    });

    const assign = (rows: any[], bucketKey: string) => {
      for (const row of rows) {
        const group = groups.get(row.department_id ?? null);
        if (!group) continue; // departamento inativo/inexistente: fora do painel (ver JSDoc)
        group[bucketKey].count += 1;
        group[bucketKey].items.push({
          id: row.id,
          reference: row.reference,
          status: row.status,
          due_date: row.due_date,
          label: row.label ?? null,
        });
      }
    };

    assign(productionOrders as any[], 'open_production_orders');
    assign(purchaseRequisitions as any[], 'open_purchase_requisitions');
    assign(inventoryCounts as any[], 'open_inventory_counts');

    // "Sem departamento" sempre por último, departamentos ativos em ordem alfabética antes.
    const ordered = [...groups.values()].filter((g) => g.department_id !== null);
    ordered.push(groups.get(null));
    return ordered;
  }
}

export = SequelizeDashboardRepository;
