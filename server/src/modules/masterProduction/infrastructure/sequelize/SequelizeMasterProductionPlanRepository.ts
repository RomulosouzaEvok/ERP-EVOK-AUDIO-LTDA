/**
 * Implementação Sequelize do repositório do Plano Mestre de Produção (G17).
 *
 * ## Por que agregação em SQL, e não em JavaScript
 *
 * As três consultas de consolidação (carteira, produção aberta, retido em
 * quarentena) são varreduras de tabela inteira agrupadas por produto. Trazer
 * as linhas para o Node e somar no laço seria N+1 disfarçado no hot path do
 * planejamento — o mesmo motivo pelo qual `quarantineBalanceService` faz uma
 * única query agregada.
 *
 * ## Nomes de coluna e literais de ENUM
 *
 * Todos foram conferidos contra o banco real (`information_schema.columns` e
 * `pg_enum`) antes de escritos, conforme
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`:
 * `sale_items.invoiced_quantity`, `products.min_quantity` (**não**
 * `min_stock`), `products.reserved_quantity`, `production_orders.quantity_produced`;
 * `enum_sales_status` = `quote,confirmed,invoiced,canceled,shipped,partially_invoiced`;
 * `enum_production_orders_status` = `planned,released,in_progress,completed,paused,canceled`;
 * `enum_products_product_type` = `finished,semi_finished,component,raw_material`.
 *
 * @module modules/masterProduction/infrastructure/sequelize/SequelizeMasterProductionPlanRepository
 */

import { Op, QueryTypes } from 'sequelize';
import type { Transaction } from 'sequelize';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import {
  BACKLOG_SALE_STATUSES,
  OPEN_PRODUCTION_ORDER_STATUSES,
  PLANNABLE_PRODUCT_TYPES,
} from '../../domain/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  MasterProductionPlan,
  MasterProductionPlanLine,
  Product,
  ProductionOrder,
  User,
  sequelize,
}: any = require('../../../../models/index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QuarantineBalanceService: any = require('../../../../services/quarantineBalanceService');

/**
 * Namespace (`classid`) do advisory lock que serializa a numeração anual do
 * plano. Valor arbitrário porém fixo e distinto do usado pela OP (41001) —
 * dois processos só competem pelo lock se usarem o MESMO par (classid, ano).
 */
const PLAN_NUMBER_LOCK_CLASS_ID = 41002;

/** Atributos de produto usados pela consolidação (e devolvidos nas telas). */
const PRODUCT_ATTRIBUTES = [
  'id', 'code', 'name', 'product_type', 'status',
  'quantity', 'reserved_quantity', 'min_quantity', 'unit', 'lead_time',
];

class SequelizeMasterProductionPlanRepository extends MasterProductionPlanRepository {
  /**
   * Soma a carteira de pedidos aberta por produto.
   *
   * O saldo é `quantity - invoiced_quantity` **por item**, com `GREATEST(...,0)`
   * defensivo: `invoiced_quantity` maior que `quantity` (dado inconsistente de
   * faturamento parcial) viraria demanda negativa e reduziria silenciosamente a
   * necessidade de outro produto no agregado.
   *
   * @returns Mapa `product_id -> saldo aberto`.
   */
  public async sumSalesBacklogByProduct(): Promise<Map<number, number>> {
    const rows: any[] = await sequelize.query(
      `SELECT si.product_id AS product_id,
              SUM(GREATEST(si.quantity - COALESCE(si.invoiced_quantity, 0), 0)) AS backlog
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
        WHERE s.status IN (:statuses)
        GROUP BY si.product_id`,
      { replacements: { statuses: [...BACKLOG_SALE_STATUSES] }, type: QueryTypes.SELECT }
    );

    return toQuantityMap(rows, 'product_id', 'backlog');
  }

  /**
   * Soma o saldo a produzir das OPs abertas por produto.
   *
   * @returns Mapa `product_id -> saldo em produção`.
   */
  public async sumOpenProductionByProduct(): Promise<Map<number, number>> {
    const rows: any[] = await sequelize.query(
      `SELECT po.product_id AS product_id,
              SUM(GREATEST(po.quantity - COALESCE(po.quantity_produced, 0), 0)) AS in_production
         FROM production_orders po
        WHERE po.status IN (:statuses)
        GROUP BY po.product_id`,
      { replacements: { statuses: [...OPEN_PRODUCTION_ORDER_STATUSES] }, type: QueryTypes.SELECT }
    );

    return toQuantityMap(rows, 'product_id', 'in_production');
  }

  /**
   * Lista produtos planejáveis com estoque mínimo cadastrado.
   *
   * @returns Produtos ativos `finished`/`semi_finished` com `min_quantity > 0`.
   */
  public async listProductsWithSafetyStock(): Promise<any[]> {
    return Product.findAll({
      attributes: PRODUCT_ATTRIBUTES,
      where: {
        status: 'active',
        product_type: { [Op.in]: [...PLANNABLE_PRODUCT_TYPES] },
        min_quantity: { [Op.gt]: 0 },
      },
      order: [['code', 'ASC']],
    });
  }

  /**
   * Carrega produtos por id.
   *
   * @param ids - Ids de produto.
   * @returns Produtos encontrados (lista vazia sem tocar o banco quando `ids` é vazio).
   */
  public async findProductsByIds(ids: Array<number | string>): Promise<any[]> {
    const normalized = normalizeIds(ids);
    if (!normalized.length) return [];

    return Product.findAll({
      attributes: PRODUCT_ATTRIBUTES,
      where: { id: { [Op.in]: normalized } },
      order: [['code', 'ASC']],
    });
  }

  /**
   * Soma o retido em quarentena/bloqueio por produto — delega ao serviço
   * compartilhado do G7 para que exista **uma** definição de "saldo retido" no
   * ERP.
   *
   * @param productIds - Ids de produto.
   * @param transaction - Transação ativa (opcional).
   * @returns Mapa `product_id -> quantidade retida`.
   */
  public async sumWithheldByProduct(
    productIds: Array<number | string>,
    transaction?: Transaction
  ): Promise<Map<number, number>> {
    return QuarantineBalanceService.sumWithheldByProduct(productIds, transaction);
  }

  /**
   * Gera o próximo número do plano do ano (`MPS-YYYY-NNNN`).
   *
   * Mesmas duas garantias adotadas na numeração da OP depois do G16:
   * advisory lock de transação por ano (serializa concorrentes) e `MAX` do
   * sufixo em vez de `COUNT` (que regride quando um registro é removido e
   * reemite número já usado, contra um UNIQUE).
   *
   * @param yearPrefix - Prefixo anual (ex.: `MPS-2026`).
   * @param transaction - Transação ativa.
   * @returns Próximo número completo (ex.: `MPS-2026-0004`).
   */
  public async nextPlanNumberForYear(yearPrefix: string, transaction: Transaction): Promise<string> {
    const year = Number(yearPrefix.split('-').pop());

    await sequelize.query(
      'SELECT pg_advisory_xact_lock(:classId, :year)',
      { replacements: { classId: PLAN_NUMBER_LOCK_CLASS_ID, year }, transaction }
    );

    const rows: any[] = await sequelize.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(plan_number FROM '([0-9]+)$') AS INTEGER)), 0) AS max_sequence
         FROM master_production_plans
        WHERE plan_number LIKE :prefix`,
      { replacements: { prefix: `${yearPrefix}-%` }, type: QueryTypes.SELECT, transaction }
    );

    const nextSequence = Number(rows[0]?.max_sequence ?? 0) + 1;
    return `${yearPrefix}-${String(nextSequence).padStart(4, '0')}`;
  }

  /** @param data - Campos do plano. @param transaction - Transação ativa. @returns Plano criado. */
  public async createPlan(data: Record<string, unknown>, transaction: Transaction): Promise<any> {
    return MasterProductionPlan.create(data, { transaction });
  }

  /** @param lines - Linhas consolidadas. @param transaction - Transação ativa. @returns Linhas criadas. */
  public async createPlanLines(lines: Array<Record<string, unknown>>, transaction: Transaction): Promise<any[]> {
    if (!lines.length) return [];
    return MasterProductionPlanLine.bulkCreate(lines, { transaction, returning: true });
  }

  /** @param id - Id do plano. @returns Plano com linhas/produto/planejador ou `null`. */
  public async findPlanById(id: number | string): Promise<any | null> {
    return MasterProductionPlan.findByPk(id, {
      include: [
        {
          model: MasterProductionPlanLine,
          as: 'lines',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'code', 'name', 'unit', 'product_type'] },
            { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number', 'status', 'due_date'] },
          ],
        },
        { model: User, as: 'planner', attributes: ['id', 'name'] },
      ],
      order: [[{ model: MasterProductionPlanLine, as: 'lines' }, 'id', 'ASC']],
    });
  }

  /** @param id - Id do plano. @returns Cabeçalho do plano (sem includes) ou `null`. */
  public async findPlanByIdRaw(id: number | string): Promise<any | null> {
    return MasterProductionPlan.findByPk(id);
  }

  /** @param id - Id do plano. @param transaction - Transação ativa. @returns Plano travado ou `null`. */
  public async findPlanByIdForUpdate(id: number | string, transaction: Transaction): Promise<any | null> {
    return MasterProductionPlan.findByPk(id, { transaction, lock: (transaction as any).LOCK.UPDATE });
  }

  /**
   * @param where - Filtro (`status`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  public async listPlans(
    where: Record<string, unknown> = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ rows: any[]; count: number }> {
    const { count, rows } = await MasterProductionPlan.findAndCountAll({
      where,
      include: [{ model: User, as: 'planner', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['id', 'DESC']],
    });
    return { rows, count };
  }

  /** @param id - Id. @param data - Campos. @param transaction - Transação ativa. @returns Linhas afetadas. */
  public async updatePlan(
    id: number | string,
    data: Record<string, unknown>,
    transaction: Transaction
  ): Promise<number> {
    const [updated] = await MasterProductionPlan.update(data, { where: { id }, transaction });
    return updated;
  }

  /** @param lineId - Id da linha. @param transaction - Transação opcional. @returns Linha ou `null`. */
  public async findLineById(lineId: number | string, transaction?: Transaction): Promise<any | null> {
    return MasterProductionPlanLine.findByPk(lineId, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'code', 'name', 'unit', 'product_type'] }],
      ...(transaction ? { transaction } : {}),
    });
  }

  /** @param planId - Id do plano. @param transaction - Transação opcional. @returns Linhas do plano. */
  public async listLinesByPlan(planId: number | string, transaction?: Transaction): Promise<any[]> {
    return MasterProductionPlanLine.findAll({
      where: { plan_id: planId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'code', 'name', 'unit', 'product_type', 'status'] }],
      order: [['id', 'ASC']],
      ...(transaction ? { transaction } : {}),
    });
  }

  /** @param lineId - Id. @param data - Campos. @param transaction - Transação opcional. @returns Linha atualizada ou `null`. */
  public async updateLine(
    lineId: number | string,
    data: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<any | null> {
    const line = await MasterProductionPlanLine.findByPk(lineId, { ...(transaction ? { transaction } : {}) });
    if (!line) return null;
    await line.update(data, { ...(transaction ? { transaction } : {}) });
    return line;
  }
}

/**
 * Converte linhas agregadas (`SUM` do Postgres devolve string em `NUMERIC`)
 * num mapa de quantidades positivas.
 *
 * @param rows - Linhas cruas da agregação.
 * @param keyField - Nome da coluna da chave.
 * @param valueField - Nome da coluna do valor.
 * @returns Mapa `chave -> quantidade` (só valores > 0).
 */
function toQuantityMap(rows: any[], keyField: string, valueField: string): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows ?? []) {
    const key = Number(row?.[keyField]);
    const value = Number(row?.[valueField] ?? 0);
    if (Number.isFinite(key) && key > 0 && Number.isFinite(value) && value > 0) {
      map.set(key, value);
    }
  }
  return map;
}

/**
 * Normaliza uma lista de ids de produto, descartando nulos e não numéricos.
 *
 * Sem o descarte ANTES da conversão, `Number(null)` viraria `0` e sujaria o
 * `WHERE` — a mesma armadilha já documentada em `quarantineBalanceService`.
 *
 * @param ids - Ids crus.
 * @returns Ids inteiros positivos, sem repetição.
 */
function normalizeIds(ids: Array<number | string>): number[] {
  return [...new Set(
    (ids ?? [])
      .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];
}

export = SequelizeMasterProductionPlanRepository;
