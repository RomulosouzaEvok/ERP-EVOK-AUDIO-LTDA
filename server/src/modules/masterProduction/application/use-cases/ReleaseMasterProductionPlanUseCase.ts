/**
 * Use case: **liberar o plano mestre gerando as Ordens de Produção** (MPS,
 * G17).
 *
 * @module modules/masterProduction/application/use-cases/ReleaseMasterProductionPlanUseCase
 *
 * Cobre `POST /api/production/master-plans/:id/release`. É o único caminho
 * pelo qual a carteira de pedidos vira produção neste ERP — e ele exige um
 * plano **firmado**, ou seja, uma decisão humana já registrada. Não existe (e
 * não deve existir) gatilho de OP na confirmação da venda: decisão D-F do dono
 * do produto, e recomendação registrada na linha do G17 do plano de ação.
 *
 * ## Rigor idêntico ao dos outros dois caminhos de criação de OP
 *
 * O G16 (2026-08-09) existiu exatamente porque havia dois caminhos de criação
 * de OP com rigor diferente — o via MRP não validava disponibilidade nenhuma e
 * criava OP impossível de concluir. Este é o **terceiro** caminho, e ele repete
 * as mesmas validações de `CreateProductionOrderUseCase` e
 * `ConvertPlannedOrdersToProductionOrderUseCase`:
 *
 * 1. produto ativo;
 * 2. produto `finished`/`semi_finished` (subconjunto é legítimo, mesma
 *    tolerância do caminho do MRP);
 * 3. **BOM ativa** — sem estrutura, a OP nasce impossível de concluir (G2);
 * 4. material mínimo disponível, contra o saldo que já desconta quarentena
 *    (G7) e reserva (G3/G9);
 * 5. numeração `OP-YYYY-NNNN` pelo repositório serializado (advisory lock +
 *    `MAX`), nunca `COUNT`.
 *
 * ## Tudo ou nada
 *
 * Os bloqueios de **todas** as linhas são coletados antes de qualquer escrita,
 * e a liberação inteira falha com a lista completa. Liberar metade do plano
 * deixaria o planejador sem saber o que foi e o que não foi para a fábrica, e
 * o status `released` do cabeçalho mentiria.
 *
 * ⚠️ Limitação conhecida e herdada: `BomService.checkAvailability` lê o estoque
 * atual e **não** participa da transação, e a reserva de material só acontece
 * quando a OP passa a `released` (não na criação). Duas linhas do mesmo plano
 * que consomem o mesmo componente são, portanto, avaliadas de forma
 * independente — exatamente como no caminho do MRP hoje. A contenção real
 * continua sendo a reserva por OP do G3, no momento da liberação da ordem.
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import { MASTER_PLAN_RULE, PLANNABLE_PRODUCT_TYPES } from '../../domain/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sequelize } = require('../../../../models/index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BomService: any = require('../../../../services/bomService');

interface ReleaseMasterProductionPlanInput {
  planId: number | string;
  /** Sempre do JWT (`req.user.id`) — nunca do body. */
  userId: number;
}

class ReleaseMasterProductionPlanUseCase extends UseCase<ReleaseMasterProductionPlanInput, any> {
  private readonly planRepository: MasterProductionPlanRepository;
  private readonly productionOrderRepository: any;

  /**
   * @param planRepository - Repositório do plano mestre.
   * @param productionOrderRepository - Repositório de Ordens de Produção
   *   (numeração serializada + criação) — o mesmo usado pelos outros caminhos.
   */
  public constructor(planRepository: MasterProductionPlanRepository, productionOrderRepository: any) {
    super();
    this.planRepository = planRepository;
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Gera uma OP por linha decidida do plano firmado.
   *
   * @param input - Id do plano e `userId` (do JWT).
   * @returns `{ plan, production_orders, released_lines }`.
   * @throws {NotFoundError} Plano inexistente. `details: { rule: 'G17' }`.
   * @throws {BusinessRuleError} Plano não firmado, plano sem linha decidida, ou
   *   qualquer linha bloqueada (produto inativo/não fabricável, sem BOM ativa,
   *   sem material). `details: { rule: 'G17', blocked_lines }`.
   */
  public async execute(input: ReleaseMasterProductionPlanInput): Promise<any> {
    return sequelize.transaction(async (transaction: any) => {
      const plan = await this.planRepository.findPlanByIdForUpdate(input.planId, transaction);
      if (!plan) {
        throw new NotFoundError('Plano mestre não encontrado.', {
          rule: MASTER_PLAN_RULE,
          plan_id: input.planId,
        });
      }

      if (String(plan.status) !== 'firm') {
        throw new BusinessRuleError(
          `Só um plano firmado gera Ordem de Produção. O plano ${plan.plan_number} está '${plan.status}'.`,
          {
            rule: MASTER_PLAN_RULE,
            plan_id: plan.id,
            current_status: plan.status,
            required_status: 'firm',
          },
        );
      }

      const lines = await this.planRepository.listLinesByPlan(plan.id, transaction);
      const releasable = lines.filter(
        (line: any) => String(line.status) === 'planned' && Number(line.planned_quantity ?? 0) > 0,
      );

      if (!releasable.length) {
        throw new BusinessRuleError(
          `Plano ${plan.plan_number} não tem nenhuma linha decidida para produzir.`,
          { rule: MASTER_PLAN_RULE, plan_id: plan.id, total_lines: lines.length },
        );
      }

      const blocked = await this.collectBlockers(releasable);
      if (blocked.length) {
        throw new BusinessRuleError(
          `A liberação do plano ${plan.plan_number} foi recusada: ${blocked.length} linha(s) não podem gerar Ordem de Produção. `
          + 'Nenhuma OP foi criada — a liberação é tudo ou nada para que o status do plano não minta sobre o que foi para a fábrica.',
          { rule: MASTER_PLAN_RULE, plan_id: plan.id, blocked_lines: blocked },
        );
      }

      const yearPrefix = `OP-${new Date().getFullYear()}`;
      const createdOrders: any[] = [];

      for (const line of releasable) {
        const orderNumber = await this.productionOrderRepository.nextOrderNumberForYear(yearPrefix, transaction);
        const order = await this.productionOrderRepository.create({
          order_number: orderNumber,
          product_id: line.product_id,
          quantity: line.planned_quantity,
          priority: 'normal',
          status: 'planned',
          due_date: line.due_date,
          // `sales_order_id` fica NULL DE PROPÓSITO: a demanda desta linha é
          // consolidada (carteira de VÁRIOS pedidos + estoque mínimo +
          // previsão). Apontar um pedido de venda arbitrário criaria uma
          // rastreabilidade falsa. O rastro verdadeiro é
          // `master_production_plan_lines.production_order_id`, que leva ao
          // plano, ao planejador e à demanda consolidada.
          sales_order_id: null,
          notes: `Gerada pelo Plano Mestre de Producao ${plan.plan_number} (linha ${line.id}).`,
          created_by: input.userId,
        }, transaction);

        await this.planRepository.updateLine(line.id, {
          status: 'released',
          production_order_id: order.id,
        }, transaction);

        createdOrders.push(order);
      }

      const planChanges = {
        status: 'released',
        released_by: input.userId,
        released_at: new Date(),
      };
      await this.planRepository.updatePlan(plan.id, planChanges, transaction);

      return {
        plan: { ...plan.get({ plain: true }), ...planChanges },
        production_orders: createdOrders,
        released_lines: releasable.map((line: any) => line.id),
      };
    });
  }

  /**
   * Avalia todas as linhas liberáveis e devolve os bloqueios encontrados.
   *
   * Coleta **tudo** antes de qualquer escrita: falhar na primeira linha
   * obrigaria o planejador a descobrir os problemas um por um, a cada tentativa
   * de liberação.
   *
   * @param lines - Linhas `planned` com quantidade positiva (com `product` incluído).
   * @returns Lista de bloqueios `{ line_id, product_id, code, reason, ... }` (vazia quando tudo pode ser liberado).
   */
  private async collectBlockers(lines: any[]): Promise<any[]> {
    const plannableTypes: readonly string[] = PLANNABLE_PRODUCT_TYPES;
    const blocked: any[] = [];

    for (const line of lines) {
      const product = line.product;
      const quantity = Number(line.planned_quantity ?? 0);

      if (!product) {
        blocked.push({ line_id: line.id, product_id: line.product_id, reason: 'product_not_found' });
        continue;
      }
      if (String(product.status) !== 'active') {
        blocked.push({ line_id: line.id, product_id: product.id, code: product.code, reason: 'inactive_product' });
        continue;
      }
      if (!plannableTypes.includes(String(product.product_type))) {
        blocked.push({
          line_id: line.id,
          product_id: product.id,
          code: product.code,
          reason: 'not_manufactured',
          product_type: product.product_type,
        });
        continue;
      }

      let availability: any;
      try {
        availability = await BomService.checkAvailability(product.id, quantity);
      } catch (bomError: any) {
        // Ausência de BOM ativa chega como 404 de `explodeBOM`. Convertido em
        // bloqueio de negócio didático, no mesmo espírito do G2 — sem BOM o
        // sistema não sabe o que consumir nem quanto o produto custa, e a OP
        // nasceria impossível de concluir.
        if (bomError?.statusCode !== 404) throw bomError;
        blocked.push({ line_id: line.id, product_id: product.id, code: product.code, reason: 'no_active_bom' });
        continue;
      }

      if (!availability?.available) {
        blocked.push({
          line_id: line.id,
          product_id: product.id,
          code: product.code,
          reason: 'insufficient_material',
          requested_quantity: quantity,
          max_possible_quantity: availability?.max_possible_quantity,
          missing_items: availability?.missing_items,
        });
      }
    }

    return blocked;
  }
}

export = ReleaseMasterProductionPlanUseCase;
