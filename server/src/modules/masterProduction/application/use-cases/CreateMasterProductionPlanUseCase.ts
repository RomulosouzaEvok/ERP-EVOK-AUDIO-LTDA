/**
 * Use case: **consolidar a demanda e abrir um Plano Mestre de Produção**
 * (MPS, G17).
 *
 * @module modules/masterProduction/application/use-cases/CreateMasterProductionPlanUseCase
 *
 * Cobre `POST /api/production/master-plans`. É o passo que fechava o buraco
 * apontado no G17: antes disto, **nada** no ERP lia a carteira de pedidos
 * aberta nem tratava o estoque mínimo como demanda. O MRP calculava
 * exclusivamente contra a lista de demandas digitada no payload
 * (`GenerateMrpPlanUseCase.execute` → `input.demands`), e confirmar uma venda
 * não produzia efeito nenhum na fábrica.
 *
 * ## As três fontes de demanda, e o que cada uma vale
 *
 * | Fonte | De onde vem | Observação |
 * |---|---|---|
 * | Carteira de pedidos | `sale_items.quantity − invoiced_quantity` das vendas `confirmed`/`partially_invoiced` | é a demanda firme; `quote` fica fora (orçamento não é pedido) |
 * | Estoque mínimo | `products.min_quantity` | até aqui só alimentava alerta de dashboard |
 * | Previsão | informada **manualmente** pelo planejador no payload | não existe entidade de forecast no ERP — risco residual registrado |
 *
 * ## O suprimento confrontado é o saldo de PLANEJAMENTO
 *
 * `max(0, products.quantity − retido em quarentena/bloqueio − reservado)`,
 * exatamente o mesmo saldo que o G7 impôs ao MRP e à disponibilidade de OP.
 * Material em quarentena não foi inspecionado e material reservado é de outra
 * ordem/venda: planejar em cima deles é planejar em cima de material que a
 * produção não pode consumir. Some-se o saldo a produzir das **OPs abertas**,
 * senão o plano manda produzir de novo o que já está na fábrica.
 *
 * ## O plano nasce SEM decisão tomada
 *
 * Toda linha nasce `status = 'pending'` e `planned_quantity = 0`, mesmo quando
 * a sugestão do sistema é maior que zero. É deliberado: a decisão D-F do dono
 * registra que **existe PCP formal — há quem planeje**, e o objetivo desta
 * camada é registrar a decisão de gente, não automatizá-la. Um plano em que
 * ninguém decidiu nada não gera OP nenhuma, e o `firm` recusa (ver
 * `FirmMasterProductionPlanUseCase`).
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, ValidationError } from '../../../../errors';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import {
  MASTER_PLAN_RULE,
  PLANNABLE_PRODUCT_TYPES,
  consolidateLineFigures,
  roundQuantity,
} from '../../domain/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sequelize } = require('../../../../models/index');

/** Formato aceito de data (o banco usa `DATEONLY`). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Previsão manual de um produto, informada pelo planejador. */
interface ForecastDemandInput {
  product_id?: number | string;
  quantity?: number | string;
}

interface CreateMasterProductionPlanInput {
  horizon_start?: string;
  horizon_end?: string;
  notes?: string;
  forecast_demands?: ForecastDemandInput[];
  /** Sempre do JWT (`req.user.id`) — nunca do body. Anti-spoofing é regra P0. */
  plannerId: number;
}

class CreateMasterProductionPlanUseCase extends UseCase<CreateMasterProductionPlanInput, any> {
  private readonly planRepository: MasterProductionPlanRepository;

  /** @param planRepository - Repositório do plano mestre. */
  public constructor(planRepository: MasterProductionPlanRepository) {
    super();
    this.planRepository = planRepository;
  }

  /**
   * Consolida a demanda do horizonte e persiste o plano com suas linhas.
   *
   * @param input - Horizonte, previsão manual opcional e `plannerId` (do JWT).
   * @returns `{ plan, lines, skipped }` — `skipped` lista produtos com demanda
   *   que o plano mestre **não** planeja (compra, não fabricação), para que a
   *   omissão seja visível em vez de silenciosa.
   * @throws {ValidationError} Horizonte ausente/mal formado/invertido, ou
   *   previsão inválida. `details: { rule: 'G17', field }`.
   * @throws {BusinessRuleError} Se não houver demanda nenhuma a planejar.
   *   `details: { rule: 'G17' }`.
   */
  public async execute(input: CreateMasterProductionPlanInput): Promise<any> {
    const horizonStart = this.parseDate(input.horizon_start, 'horizon_start');
    const horizonEnd = this.parseDate(input.horizon_end, 'horizon_end');

    if (horizonEnd < horizonStart) {
      throw new ValidationError('horizon_end não pode ser anterior a horizon_start.', {
        rule: MASTER_PLAN_RULE,
        field: 'horizon_end',
        horizon_start: horizonStart,
        horizon_end: horizonEnd,
      });
    }

    const forecastByProduct = this.parseForecastDemands(input.forecast_demands);

    const [salesBacklog, inProduction, safetyStockProducts] = await Promise.all([
      this.planRepository.sumSalesBacklogByProduct(),
      this.planRepository.sumOpenProductionByProduct(),
      this.planRepository.listProductsWithSafetyStock(),
    ]);

    const productById = new Map<number, any>();
    for (const product of safetyStockProducts ?? []) {
      productById.set(Number(product.id), product);
    }

    // Produtos que entram no plano por carteira ou previsão e não têm estoque
    // mínimo cadastrado (portanto não vieram da consulta acima).
    const missingIds = [...salesBacklog.keys(), ...forecastByProduct.keys()]
      .filter((id) => !productById.has(id));
    if (missingIds.length) {
      for (const product of await this.planRepository.findProductsByIds(missingIds)) {
        productById.set(Number(product.id), product);
      }
    }

    const plannableTypes: readonly string[] = PLANNABLE_PRODUCT_TYPES;
    const skipped: any[] = [];
    const plannableIds: number[] = [];

    for (const [productId, product] of productById) {
      const hasDemand = (salesBacklog.get(productId) ?? 0) > 0
        || (forecastByProduct.get(productId) ?? 0) > 0
        || Number(product.min_quantity ?? 0) > 0;
      if (!hasDemand) continue;

      // Demanda de produto que não é de fabricação própria é necessidade de
      // COMPRA — quem a atende é o MRP → Requisição de Compra. Registrar em
      // `skipped` em vez de omitir em silêncio: o G10 ensinou neste projeto
      // que "passar batido" é o pior desfecho possível.
      if (!plannableTypes.includes(String(product.product_type))) {
        skipped.push({
          product_id: productId,
          code: product.code,
          reason: 'not_manufactured',
          product_type: product.product_type,
        });
        continue;
      }
      if (String(product.status) !== 'active') {
        skipped.push({ product_id: productId, code: product.code, reason: 'inactive_product' });
        continue;
      }

      plannableIds.push(productId);
    }

    if (!plannableIds.length) {
      throw new BusinessRuleError(
        'Não há demanda a planejar: nenhuma carteira de pedidos aberta, estoque mínimo ou previsão para produto de fabricação própria.',
        { rule: MASTER_PLAN_RULE, skipped },
      );
    }

    const withheldByProduct = await this.planRepository.sumWithheldByProduct(plannableIds);

    const consolidatedLines = plannableIds
      .map((productId) => {
        const product = productById.get(productId);
        const figures = consolidateLineFigures({
          salesBacklog: salesBacklog.get(productId) ?? 0,
          safetyStock: Number(product.min_quantity ?? 0),
          forecast: forecastByProduct.get(productId) ?? 0,
          physicalOnHand: Number(product.quantity ?? 0),
          withheld: withheldByProduct.get(productId) ?? 0,
          reserved: Number(product.reserved_quantity ?? 0),
          inProduction: inProduction.get(productId) ?? 0,
        });

        return {
          product_id: productId,
          ...figures,
          // A decisão nasce vazia: `planned_quantity` é do planejador, não do
          // cálculo. `suggested_quantity` nunca é sobrescrita, então a
          // divergência entre cálculo e decisão fica auditável.
          planned_quantity: 0,
          due_date: horizonEnd,
          status: 'pending',
        };
      })
      .sort((a, b) => b.net_requirement - a.net_requirement || a.product_id - b.product_id);

    return sequelize.transaction(async (transaction: any) => {
      const yearPrefix = `MPS-${new Date().getFullYear()}`;
      const planNumber = await this.planRepository.nextPlanNumberForYear(yearPrefix, transaction);

      const plan = await this.planRepository.createPlan({
        plan_number: planNumber,
        horizon_start: horizonStart,
        horizon_end: horizonEnd,
        status: 'draft',
        created_by: input.plannerId,
        planner_id: input.plannerId,
        consolidated_at: new Date(),
        notes: input.notes ? String(input.notes).trim() : null,
      }, transaction);

      const lines = await this.planRepository.createPlanLines(
        consolidatedLines.map((line) => ({ ...line, plan_id: plan.id })),
        transaction,
      );

      return { plan, lines, skipped };
    });
  }

  /**
   * Valida e normaliza uma data do horizonte.
   *
   * Não há default: horizonte de planejamento é política de PCP e o dono não a
   * definiu (ver cabeçalho de `domain/constants.ts`).
   *
   * @param value - Valor recebido no payload.
   * @param field - Nome do campo, usado no `details` do erro.
   * @returns Data normalizada `YYYY-MM-DD`.
   * @throws {ValidationError} Se ausente ou fora do formato. `details: { rule: 'G17', field }`.
   */
  private parseDate(value: unknown, field: string): string {
    const raw = String(value ?? '').trim();
    if (!ISO_DATE.test(raw) || Number.isNaN(Date.parse(raw))) {
      throw new ValidationError(
        `${field} é obrigatório no formato YYYY-MM-DD: o horizonte de planejamento é declarado pelo planejador, o sistema não arbitra um.`,
        { rule: MASTER_PLAN_RULE, field },
      );
    }
    return raw;
  }

  /**
   * Valida a previsão manual e a agrega por produto.
   *
   * @param demands - Lista `[{ product_id, quantity }]` do payload.
   * @returns Mapa `product_id -> quantidade prevista` (vazio quando não informada).
   * @throws {ValidationError} Produto inválido ou quantidade não positiva.
   *   `details: { rule: 'G17', field }`.
   */
  private parseForecastDemands(demands: ForecastDemandInput[] | undefined): Map<number, number> {
    const byProduct = new Map<number, number>();
    if (!Array.isArray(demands) || !demands.length) return byProduct;

    demands.forEach((demand, index) => {
      const productId = Number(demand?.product_id);
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new ValidationError(`forecast_demands[${index}].product_id inválido.`, {
          rule: MASTER_PLAN_RULE,
          field: 'forecast_demands.product_id',
          index,
        });
      }

      const quantity = roundQuantity(demand?.quantity);
      if (!(quantity > 0)) {
        throw new ValidationError(`forecast_demands[${index}].quantity deve ser maior que zero.`, {
          rule: MASTER_PLAN_RULE,
          field: 'forecast_demands.quantity',
          index,
        });
      }

      byProduct.set(productId, roundQuantity((byProduct.get(productId) ?? 0) + quantity));
    });

    return byProduct;
  }
}

export = CreateMasterProductionPlanUseCase;
