/**
 * Use case: alterar status da OP.
 *
 * @module modules/production/application/use-cases/ChangeProductionOrderStatusUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ProductionOrderEntity from '../../domain/entities/ProductionOrderEntity';
import { NotFoundError, ValidationError, ConflictError, BusinessRuleError, AppError } from '../../../../errors';
import logger from '../../../../config/logger';
import {
  PRODUCTION_TRACKING_RULES,
  assertCompletedStepsHaveMeasurableTime,
  assertHasCompletedStep,
  assertLaborRateIsResolvable,
  assertNoOpenSteps,
  assertOrderCanStart,
  assertProducedQuantityMatchesTracking,
  assertTrackingExists,
  computeStepHours,
  resolveStepLaborRate,
  resolveTrackingEnforcementMode,
  type TrackingEnforcementMode,
} from '../../domain/productionTrackingRules';
const InventoryService: any = require('../../../../services/inventoryService');
const WarehouseStockService: any = require('../../../../services/warehouseStockService');
const CostingService: any = require('../../../../services/costingService');
const BomService: any = require('../../../../services/bomService');
const { LotControl, ProductionLotConsumption, SerialNumber, ProductionCostSettings }: any = require('../../../../models/index');
import { sequelize } from '../../../../config/database';
import { Op } from 'sequelize';

interface ChangeProductionOrderStatusInput {
  id: number;
  status: string;
  quantity_produced?: number;
  quantity_scrapped?: number;
  scrap_reason?: string | null;
  allow_overproduction?: boolean;
  lot_consumptions?: Array<{
    product_id: number;
    lot_control_id: number;
    quantity: number;
    notes?: string;
  }>;
  finished_lot_number?: string;
  serial_numbers?: string[];
  user_id: number;
}

class ChangeProductionOrderStatusUseCase extends UseCase<ChangeProductionOrderStatusInput, Promise<any>> {
  public static VALID_TRANSITIONS = ProductionOrderEntity.STATUS_TRANSITIONS;
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Altera o status da OP e aplica efeitos colaterais da conclusao.
   *
   * @param input - Dados de transicao.
   * @returns Status anterior, numero da OP, OP atualizada e campos persistidos.
   * @throws {ValidationError} Se o status for ausente/invalido.
   * @throws {NotFoundError} Se a OP nao existir.
   * @throws {ConflictError} Se estoque/custo falhar.
   */
  public async execute(input: ChangeProductionOrderStatusInput): Promise<any> {
    if (!input.status) throw new ValidationError('Status e obrigatorio');

    const t = await sequelize.transaction();
    try {
      const order = await this.productionOrderRepository.findByIdForUpdate(input.id, t);
      if (!order) throw new NotFoundError('Ordem de producao nao encontrada');

      const previousStatus = order.status;
      const orderNumber = order.order_number;
      const entity = new ProductionOrderEntity(order.get ? order.get({ plain: true }) : order);
      const updateData = entity.transitionTo(input.status as any, input.quantity_produced, {
        allowOverproduction: !!input.allow_overproduction,
        quantityScrapped: input.quantity_scrapped,
        scrapReason: input.scrap_reason
      });

      if (input.status === 'released') {
        await this.reserveMaterials(order, input.user_id, t);
        const productionRouteId = await this.materializeTrackingFromActiveRoute(order, t);
        if (productionRouteId !== null) {
          updateData.production_route_id = productionRouteId;
        }
      }

      if (input.status === 'in_progress') {
        await this.assertOrderIsReadyToStart(order, t);
        // G6: quem manda a ordem para o chao de fabrica responde por ela ate
        // ser reatribuida. Preencher em vez de recusar fecha o buraco de
        // auditoria sem inventar obrigatoriedade — `responsible_id` e opcional
        // por desenho em todo o modulo. A coluna e FK para `employees.id`, e
        // nao para `users.id`: sem a traducao, o id do JWT apontaria para
        // outro funcionario. Usuario que nao e funcionario deixa o campo como
        // esta — nao se trava a partida por causa de um cadastro de RH.
        if (!order.responsible_id && input.user_id) {
          const employee = await this.productionOrderRepository.findEmployeeByUserId(input.user_id, t);
          if (employee?.id) updateData.responsible_id = employee.id;
        }
      }

      if (input.status === 'completed') {
        await this.assertTrackingIsSufficientForCompletion(order, updateData.quantity_produced || 0, t);
        await this.completeOrder(order, previousStatus, updateData.quantity_produced || 0, input, t);
      }

      if (input.status === 'canceled') {
        await this.releaseMaterialsIfReserved(order, input.user_id, t, `Liberacao por cancelamento da OP ${order.order_number}`);
      }

      await this.productionOrderRepository.update(input.id, updateData, t);
      await t.commit();

      const updated = await this.productionOrderRepository.findByIdWithProductSummary(input.id);
      return { previousStatus, orderNumber, order: updated, updateData };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Le o modo de vigencia do apontamento obrigatorio (gap G4).
   *
   * `PRODUCTION_TRACKING_REQUIRED` ausente ou invalido → `block` (a lei
   * aplicada). Valor invalido tambem gera log de erro: um typo jamais pode
   * DESLIGAR uma regra fiscal em silencio.
   *
   * A leitura acontece a cada chamada, de proposito — permite virar a chave
   * durante a janela de UAT sem reiniciar o processo, e mantem o modulo de
   * regras puro (ele recebe o valor bruto por parametro).
   *
   * @returns Modo aplicado (`block` ou `warn`).
   */
  private resolveEnforcementMode(): TrackingEnforcementMode {
    const resolution = resolveTrackingEnforcementMode(process.env.PRODUCTION_TRACKING_REQUIRED);

    if (resolution.invalidValue !== undefined) {
      logger.error('PRODUCTION_TRACKING_REQUIRED com valor invalido; aplicando modo seguro "block".', {
        rule: PRODUCTION_TRACKING_RULES.MODE_INVALID,
        received: resolution.invalidValue,
        accepted: ['block', 'warn'],
        applied: resolution.mode,
      });
    }

    return resolution.mode;
  }

  /**
   * Materializa as etapas do roteiro ATIVO do produto como apontamentos
   * `pending` da OP, no momento da liberacao (gap G4).
   *
   * ## Por que na liberacao, e por que isto e parte do G4
   *
   * Exigir apontamento sem dar ao operador contra o que apontar seria regra
   * inexequivel — a mesma armadilha que o G5 evitou ao entregar a API de
   * roteiro. Aqui a OP liberada ja nasce com sua lista de operacoes a executar,
   * e o chao de fabrica (`Producao > Chao de Fabrica`) so precisa iniciar e
   * concluir cada uma.
   *
   * ## O vinculo "como executado", sem coluna nova
   *
   * Cada linha criada guarda `production_route_step_id` da revisao que estava
   * ATIVA no instante da liberacao. Como roteiro `active` e imutavel (regra G5
   * `G5-ROUTE-NOT-DRAFT`) e uma revisao substituida vira `superseded` **com as
   * etapas intactas**, o processo efetivamente executado fica reconstituivel a
   * partir dos proprios apontamentos. A OP tambem grava o roteiro ativo usado
   * na liberacao.
   *
   * **Limite honesto desta mitigacao:** ela cobre a OP liberada COM roteiro
   * ativo. Apontamento criado a mao (`POST /api/production-orders/:id/tracking`
   * sem `production_route_step_id`) continua sem o vinculo fino da etapa, mas o
   * roteiro da OP agora fica persistido.
   *
   * ## Idempotencia
   *
   * Se a OP ja tiver qualquer apontamento, nada e criado. Isso protege o
   * caminho `released → canceled → ...` e qualquer reprocessamento, e evita
   * colidir com o indice unico `(production_order_id, sequence)`.
   *
   * No modo `warn` a materializacao NAO acontece: criar etapas pendentes sem o
   * bloqueio ligado apenas faria a regra pre-existente de "etapa em aberto"
   * barrar a conclusao, tornando a janela de transicao inutil.
   *
   * @param order - OP travada.
   * @param transaction - Transacao ativa.
   * @returns void
   */
  private async materializeTrackingFromActiveRoute(order: any, transaction: any): Promise<number | null> {
    if (this.resolveEnforcementMode() !== 'block') return null;

    const existing = await this.productionOrderRepository.listTrackingByOrderForUpdate(order.id, transaction);
    if (existing && existing.length > 0) return order.production_route_id ?? null;

    const route = await this.productionOrderRepository.findActiveRouteWithStepsByProduct(order.product_id, transaction);
    const steps = route?.steps ?? [];
    if (steps.length === 0) {
      // Sem roteiro ativo (ou roteiro sem etapa ativa) a liberacao segue: o
      // bloqueio mora na CONCLUSAO, com mensagem dizendo o que cadastrar. Nao
      // se trava a liberacao por falta de roteiro — isso pararia a fabrica por
      // um problema de cadastro que ainda da tempo de resolver.
      logger.warn('OP liberada sem roteiro ativo: nenhum apontamento foi materializado.', {
        rule: PRODUCTION_TRACKING_RULES.TRACKING_REQUIRED,
        production_order_id: order.id,
        order_number: order.order_number,
        product_id: order.product_id,
      });
      return null;
    }

    await this.productionOrderRepository.bulkCreateTracking(
      steps.map((step: any) => ({
        production_order_id: order.id,
        production_route_step_id: step.id,
        sequence: step.sequence,
        status: 'pending',
        quantity_good: 0,
        quantity_scrapped: 0,
        notes: `Etapa ${step.step_code} - ${step.name} (roteiro ${route.route_code} rev. ${route.revision})`,
      })),
      transaction,
    );

    return route.id;
  }

  /**
   * Porta de entrada da conclusao: exige apontamento de producao (gap G4).
   *
   * Roda ANTES de `completeOrder`, portanto antes de qualquer escrita de
   * estoque, lote, custo ou status — se qualquer regra reprovar, **nada foi
   * gravado**, e nem depende do rollback para isso.
   *
   * Regras aplicadas, em ordem, todas com `details.rule`:
   *
   * | Ordem | Regra | Codigo | Vale no modo `warn`? |
   * |---|---|---|---|
   * | 1 | nenhuma etapa em aberto | `G4-TRACKING-STEP-OPEN` | **sim** |
   * | 2 | existe apontamento | `G4-TRACKING-REQUIRED` | nao |
   * | 3 | existe etapa concluida | `G4-TRACKING-NO-COMPLETED` | nao |
   * | 4 | quantidade x ultima etapa | `G4-TRACKING-QTY-EXCEEDS` | **sim** (quando ha etapa concluida) |
   * | 5 | tempo apontado mensuravel | `G4-TRACKING-TIME-MISSING` | nao |
   * | 6 | taxa horaria resolvivel | `G4-LABOR-RATE-MISSING` | nao |
   *
   * As regras 1 e 4 sao anteriores ao G4 (reconciliacao 1.3, "apontamento x OP
   * desconectados") e por isso **nao** fazem parte da janela de transicao: se o
   * chao de fabrica ja abriu etapas, fecha-las e obrigacao independente.
   *
   * @param order - OP travada.
   * @param producedQty - Quantidade produzida declarada na conclusao.
   * @param transaction - Transacao ativa.
   * @returns void
   * @throws {BusinessRuleError} 422 com `details.rule` em qualquer reprovacao.
   */
  /**
   * **G6** — gate de PARTIDA da ordem (`* → in_progress`).
   *
   * ## Por que este gate nasceu só agora
   *
   * O G6 ficou três rodadas sem implementação porque as validações sugeridas
   * (centro de trabalho e operador em `production_orders`) exigiam colunas que
   * a tabela não tem. O que destravou foi o par G5 + G4: com roteiro
   * cadastrável e apontamento obrigatório na conclusão, a pré-condição real da
   * partida deixou de precisar de coluna nova — e ficou visível um defeito de
   * processo que o G4 sozinho não resolve.
   *
   * Hoje, produto sem roteiro ativo é **liberado** (a materialização só grava
   * um `warn` no log), a fábrica monta o lote inteiro, e a OP só é recusada na
   * **conclusão** — com material já consumido e horas já gastas. Recusar na
   * partida transforma uma perda de produção em um problema de cadastro que
   * ainda dá tempo de resolver.
   *
   * ## Mesma chave do G4, de propósito
   *
   * Respeita `PRODUCTION_TRACKING_REQUIRED`: em `warn` o gate apenas registra
   * o log e deixa passar. É a mesma família de regra (a OP precisa ter contra
   * o que apontar) e um segundo botão criaria a chance de desligar metade da
   * obrigação sem perceber.
   *
   * ## O furo fechado em 2026-08-11
   *
   * O gate contava linhas de apontamento. Como
   * `POST /api/production-orders/:id/tracking` aceita
   * `production_route_step_id: null` (apontamento manual, que é fluxo
   * legítimo), **uma linha manual vazia destravava a partida de uma OP sem
   * roteiro nenhum**. Agora a pré-condição é ter lastro de roteiro: alguma
   * linha ligada a uma etapa, **ou** roteiro ativo cadastrado para o produto
   * — que é exatamente a saída que a mensagem de erro indica. Apontar à mão
   * DEPOIS da partida continua livre: o gate é de partida.
   *
   * @param order - OP travada.
   * @param transaction - Transação ativa.
   * @returns void
   * @throws {BusinessRuleError} 422 `G6-START-NO-ROUTE` / `G6-START-NO-ROUTE-STEP` / `G6-START-WC-INACTIVE`.
   */
  private async assertOrderIsReadyToStart(order: any, transaction: any): Promise<void> {
    const detailedTrackings = await this.productionOrderRepository.listTrackingWithRouteStepByOrder(order.id, transaction);

    if (this.resolveEnforcementMode() === 'warn') {
      if (!detailedTrackings || detailedTrackings.length === 0) {
        logger.warn('OP iniciada SEM nenhuma etapa de apontamento (PRODUCTION_TRACKING_REQUIRED=warn).', {
          rule: PRODUCTION_TRACKING_RULES.START_WITHOUT_ROUTE,
          production_order_id: order.id,
          order_number: order.order_number,
          product_id: order.product_id,
        });
      }
      return;
    }

    // Auditoria 2026-08-11: a contagem de linhas nao basta — linha manual
    // aceita `production_route_step_id: null`. A saida honesta para quem
    // esbarrar no bloqueio e cadastrar o roteiro, entao a existencia dele
    // tambem destrava a partida (e o que a mensagem de erro manda fazer). A
    // consulta roda so quando o modo e `block`, e devolve a MESMA revisao
    // ativa que a liberacao materializaria.
    const activeRoute = await this.productionOrderRepository.findActiveRouteWithStepsByProduct(order.product_id, transaction);

    assertOrderCanStart(order.order_number, detailedTrackings || [], {
      activeRouteStepCount: activeRoute?.steps?.length ?? 0,
    });
  }

  private async assertTrackingIsSufficientForCompletion(order: any, producedQty: number, transaction: any): Promise<void> {
    const mode = this.resolveEnforcementMode();
    const trackings = await this.productionOrderRepository.listTrackingByOrderForUpdate(order.id, transaction);

    // Regra pre-existente (1.3): vale nos dois modos.
    assertNoOpenSteps(order.order_number, trackings || []);

    if (mode === 'warn') {
      if (!trackings || trackings.length === 0) {
        logger.warn('OP concluida SEM apontamento de producao (PRODUCTION_TRACKING_REQUIRED=warn).', {
          rule: PRODUCTION_TRACKING_RULES.TRACKING_REQUIRED,
          production_order_id: order.id,
          order_number: order.order_number,
          product_id: order.product_id,
          quantity_produced: producedQty,
        });
      }
      assertProducedQuantityMatchesTracking(order.order_number, trackings || [], producedQty);
      return;
    }

    assertTrackingExists(order.order_number, trackings || []);
    assertHasCompletedStep(order.order_number, trackings);
    assertProducedQuantityMatchesTracking(order.order_number, trackings, producedQty);

    // As duas ultimas regras precisam do centro de trabalho de cada etapa, que
    // so a consulta com `include` traz. As linhas ja estao travadas pelo
    // `listTrackingByOrderForUpdate` acima — esta segunda leitura acontece
    // dentro da mesma transacao e enxerga exatamente as mesmas linhas.
    const detailedTrackings = await this.productionOrderRepository.listTrackingWithRouteStepByOrder(order.id, transaction);
    assertCompletedStepsHaveMeasurableTime(order.order_number, detailedTrackings || []);

    const settings = await this.getProductionCostSettings(transaction);
    assertLaborRateIsResolvable(
      order.order_number,
      detailedTrackings || [],
      parseFloat(String(settings.default_labor_rate_per_hour ?? 0)),
    );
  }

  /**
   * Completa a OP consumindo componentes, recebendo produto acabado e
   * registrando custo real (material + mao-de-obra apontada + overhead
   * rateado — item 7/9 do LEVANTAMENTO_ERP, ver `registerLaborAndOverheadCost`).
   *
   * @param order - OP travada.
   * @param previousStatus - Status anterior.
   * @param producedQty - Quantidade produzida.
   * @param input - Dados de conclusao.
   * @param transaction - Transacao ativa.
   * @returns void
   * @throws {ConflictError} Se estoque/custo falhar.
   */
  private async completeOrder(order: any, previousStatus: string, producedQty: number, input: ChangeProductionOrderStatusInput, transaction: any): Promise<void> {
    // Concluir com quantidade zero nao e conclusao — e cancelamento. Ate
    // 2026-08-09 este `return` silencioso marcava a OP como `completed` sem
    // consumir nada, sem criar lote e, pior, sem liberar a reserva de
    // material (a liberacao mora dentro do bloco da explosao, abaixo), que
    // ficava presa indefinidamente (gap G2 da auditoria da cadeia do produto).
    if (producedQty <= 0) {
      throw new BusinessRuleError(
        `Nao e possivel concluir a OP ${order.order_number} com quantidade produzida zero. `
        + 'Informe a quantidade produzida, ou cancele a OP (status `canceled`) — o cancelamento libera '
        + 'o material reservado, a conclusao com zero deixaria a reserva presa.',
        { rule: 'G2', orderNumber: order.order_number, quantityProduced: producedQty },
      );
    }

    try {
      // Roteamento de deposito (Bloco 4, BUSINESS_RULES.md §12 item 7):
      // consumo de componentes sai sempre de INSUMOS; produto acabado
      // concluido entra sempre em ACABADOS.
      const insumosWarehouse = await WarehouseStockService.getWarehouseByCode('INSUMOS', transaction);
      const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

      // A explosao da BOM governa TUDO na conclusao: consumo de componentes,
      // baixa de lote e o custo que entra no estoque. Ate 2026-08-09 o 404 de
      // "sem BOM ativa" era engolido aqui, e a OP concluia mesmo assim — nada
      // era consumido, nenhum lote baixado, e o produto acabado entrava em
      // estoque com custo ZERO, contaminando o custo medio de todo o resto
      // (gap G2 da auditoria da cadeia do produto). Concluir sem BOM ativa
      // passa a ser erro de negocio explicito.
      let explosion: any = null;
      try {
        explosion = await BomService.explodeBOM(order.product_id, producedQty, { includeCost: true });
      } catch (bomError: any) {
        if (bomError.statusCode !== 404) throw bomError;
        throw new BusinessRuleError(
          `Nao e possivel concluir a OP ${order.order_number}: o produto nao tem estrutura (BOM) ativa. `
          + 'Sem ela o sistema nao sabe o que consumir nem quanto o produto custa — concluir assim faria o '
          + 'produto acabado entrar em estoque com custo zero. Ative uma BOM para este produto e conclua novamente.',
          { rule: 'G2', productId: order.product_id, orderNumber: order.order_number },
        );
      }

      if (explosion) {
        this.assertTrackedConsumptionInput(explosion.components, input.lot_consumptions);
        if (['released', 'in_progress', 'paused'].includes(previousStatus)) {
          // G3: libera exatamente o que ESTA OP reservou (nem mais, nem
          // menos), antes de consumir de fato. Ver `releaseOwnReservations`.
          await this.releaseOwnReservations(
            order,
            input.user_id,
            transaction,
            `Liberacao de reserva antes do consumo - Producao ${order.order_number}`
          );
        }
        const normalizedConsumptions = this.normalizeLotConsumptions(input.lot_consumptions);
        for (const component of explosion.components) {
          await InventoryService.consume(component.component_id, component.quantity, input.user_id, transaction, {
            description: `Consumo de componente - Producao ${order.order_number}`,
            referenceId: order.id,
            referenceType: 'production',
            warehouseId: insumosWarehouse.id
          });

          // Dual-write (BUSINESS_RULES.md §12 item 3): consumo de componentes
          // sai do Deposito de Insumos, nunca deixando o saldo do deposito
          // negativo (422 didatico em removeFromWarehouse).
          await WarehouseStockService.removeFromWarehouse(component.component_id, insumosWarehouse.id, component.quantity, transaction);

          await this.consumeLotsForComponent({
            order,
            productId: component.component_id,
            quantity: component.quantity,
            userId: input.user_id,
            transaction,
            requestedConsumptions: normalizedConsumptions.get(component.component_id) ?? []
          });
        }
      }

      const totalCost = explosion ? parseFloat(explosion.total_cost || 0) : 0;
      const unitCost = producedQty > 0 ? totalCost / producedQty : 0;
      const { product } = await InventoryService.receive(order.product_id, producedQty, input.user_id, transaction, {
        description: `Producao concluida - ${order.order_number}`,
        referenceId: order.id,
        referenceType: 'production',
        warehouseId: acabadosWarehouse.id
      });

      // Dual-write (BUSINESS_RULES.md §12 item 3): produto acabado recebido
      // entra sempre no Deposito de Produto Acabado, nunca em Insumos.
      await WarehouseStockService.addToWarehouse(order.product_id, acabadosWarehouse.id, producedQty, transaction);

      const finishedLot = await this.createFinishedLot({
        order,
        producedQty,
        userId: input.user_id,
        transaction,
        finishedLotNumber: input.finished_lot_number,
        warehouseId: acabadosWarehouse.id
      });

      await this.createSerialNumbersIfNeeded({
        order,
        lotControlId: finishedLot.id,
        serialNumbers: input.serial_numbers,
        userId: input.user_id,
        transaction
      });

      await CostingService.registerWeightedAverageCost({
        product,
        quantity: producedQty,
        unitCost,
        sourceType: 'production',
        sourceId: order.id,
        userId: input.user_id,
        notes: `Custo real de producao - ${order.order_number}`
      }, transaction);

      await this.registerLaborAndOverheadCost({
        order,
        producedQty,
        materialTotalCost: totalCost,
        product,
        userId: input.user_id,
        transaction
      });
    } catch (stockError: any) {
      // Erros ja tipados (BusinessRuleError, NotFoundError, ValidationError
      // lancados por validacoes explicitas desta classe, ex.: lote
      // vencido/bloqueado) devem propagar com seu proprio status/codigo,
      // nao serem mascarados como um generico 409 de "falha de estoque".
      if (stockError instanceof AppError) throw stockError;
      throw new ConflictError(stockError.message);
    }
  }

  /**
   * Calcula e registra o custo real de mao-de-obra e overhead da OP
   * concluida (roadmap pos-Go-Live, item 7/9 do LEVANTAMENTO_ERP), em
   * lancamentos separados no `ProductCostLedger`
   * (`source_type: 'production_labor'` e `'production_overhead'`), somando
   * ao custo real de material ja registrado por
   * `CostingService.registerWeightedAverageCost` nesta mesma conclusao.
   *
   * Formulas aplicadas:
   * - **Mao-de-obra:** para cada etapa de apontamento `completed` da OP,
   *   `horas = (finished_at - started_at) em horas` x taxa do centro de
   *   trabalho da etapa (`work_centers.cost_per_hour` quando
   *   `production_route_steps.work_center_id` estiver preenchido; senao,
   *   fallback `production_cost_settings.default_labor_rate_per_hour`).
   *   Soma-se o custo de todas as etapas concluidas.
   *
   *   **Gap G4 (2026-08-10):** com `PRODUCTION_TRACKING_REQUIRED=block`
   *   (padrao) este caminho nunca mais e alcancado com mao-de-obra zero — a
   *   conclusao ja foi barrada por
   *   {@link assertTrackingIsSufficientForCompletion}. O tratamento tolerante
   *   descrito abaixo so vale no modo de transicao `warn`: OP sem nenhum
   *   apontamento (ou sem etapas `completed`) nao gera lancamento de
   *   mao-de-obra (decisao: nao ha base para estimar horas trabalhadas em
   *   OPs legadas/sem rastreamento por etapa — nenhum custo e melhor que um
   *   custo fabricado).
   * - **Overhead:** `overhead_rate_percent / 100` aplicado sobre a base
   *   configurada em `production_cost_settings.overhead_calculation_basis`
   *   (`material_labor` = material + mao-de-obra desta mesma conclusao;
   *   `labor_only` = so mao-de-obra; `material_only` = so material).
   *
   * Ambos os lancamentos, quando o valor calculado e zero (sem apontamento
   * ou taxa de overhead zerada), sao omitidos do ledger — nao ha valor de
   * auditoria em registrar entradas de custo zero.
   *
   * @param params - Contexto da OP concluida.
   * @param params.order - OP travada.
   * @param params.producedQty - Quantidade produzida (boa) na conclusao.
   * @param params.materialTotalCost - Custo total de material ja calculado
   *   (explosao de BOM) nesta mesma conclusao.
   * @param params.product - Instancia do produto acabado (ja atualizada
   *   pelo custeio de material).
   * @param params.userId - Usuario executor.
   * @param params.transaction - Transacao ativa.
   * @returns void
   */
  private async registerLaborAndOverheadCost(params: {
    order: any;
    producedQty: number;
    materialTotalCost: number;
    product: any;
    userId: number;
    transaction: any;
  }): Promise<void> {
    const { order, producedQty, materialTotalCost, product, userId, transaction } = params;
    if (producedQty <= 0) return;

    const settings = await this.getProductionCostSettings(transaction);
    const laborTotalCost = await this.calculateLaborCost(order, settings, transaction);
    const laborUnitCost = laborTotalCost / producedQty;

    if (laborTotalCost > 0.0001) {
      await CostingService.registerAdditionalProductionCost({
        product,
        quantity: producedQty,
        unitCost: laborUnitCost,
        sourceType: 'production_labor',
        sourceId: order.id,
        userId,
        notes: `Custo real de mao-de-obra apontada - ${order.order_number}`
      }, transaction);
    }

    const overheadBasis = settings.overhead_calculation_basis || 'material_labor';
    const overheadBase = overheadBasis === 'labor_only'
      ? laborTotalCost
      : overheadBasis === 'material_only'
        ? materialTotalCost
        : materialTotalCost + laborTotalCost;
    const overheadRate = parseFloat(String(settings.overhead_rate_percent || 0)) / 100;
    const overheadTotalCost = overheadBase * overheadRate;
    const overheadUnitCost = overheadTotalCost / producedQty;

    if (overheadTotalCost > 0.0001) {
      await CostingService.registerAdditionalProductionCost({
        product,
        quantity: producedQty,
        unitCost: overheadUnitCost,
        sourceType: 'production_overhead',
        sourceId: order.id,
        userId,
        notes: `Overhead rateado (${overheadBasis}, ${settings.overhead_rate_percent}%) - ${order.order_number}`
      }, transaction);
    }
  }

  /**
   * Soma as horas apontadas (`started_at` a `finished_at`) das etapas
   * `completed` da OP multiplicadas pela taxa de custo do centro de
   * trabalho de cada etapa (com fallback global quando a etapa nao tem
   * `work_center_id`).
   *
   * **A matematica nao mudou no G4.** O que mudou e de onde ela vem: horas e
   * taxa agora saem de {@link computeStepHours} e {@link resolveStepLaborRate},
   * as MESMAS funcoes puras que a porta de entrada
   * ({@link assertTrackingIsSufficientForCompletion}) usa para reprovar a
   * conclusao. Se as duas implementacoes divergissem, o gate aprovaria uma OP
   * cujo custo de mao-de-obra sairia zero assim mesmo — que e exatamente o
   * defeito que o G4 elimina.
   *
   * No modo `block`, `null` (hora nao mensuravel ou taxa nao resolvivel) e
   * inalcancavel aqui: o gate ja barrou. No modo `warn` o `continue` historico
   * permanece, preservando o comportamento anterior durante a transicao.
   *
   * @param order - OP travada.
   * @param settings - Configuracao de custeio (`production_cost_settings`).
   * @param transaction - Transacao ativa.
   * @returns Custo total de mao-de-obra apontada (BRL), 0 se sem apontamento.
   */
  private async calculateLaborCost(order: any, settings: any, transaction: any): Promise<number> {
    const trackings = await this.productionOrderRepository.listTrackingWithRouteStepByOrder(order.id, transaction);
    if (!trackings || trackings.length === 0) return 0;

    const fallbackRate = parseFloat(String(settings.default_labor_rate_per_hour || 0));
    let total = 0;

    for (const step of trackings) {
      if (step.status !== 'completed') continue;

      const hours = computeStepHours(step);
      if (hours === null) continue;

      const resolvedRate = resolveStepLaborRate(step, fallbackRate);
      if (resolvedRate === null) continue;

      total += hours * resolvedRate.rate;
    }

    return total;
  }

  /**
   * Le a configuracao singleton de custeio de producao (`production_cost_settings`, `id = 1`).
   *
   * @param transaction - Transacao ativa.
   * @returns Configuracao encontrada, ou valores neutros (0%) se a linha singleton nao existir.
   */
  private async getProductionCostSettings(transaction: any): Promise<{
    overhead_calculation_basis: string;
    overhead_rate_percent: number;
    default_labor_rate_per_hour: number;
  }> {
    const settings = await ProductionCostSettings.findByPk(1, { transaction });
    if (!settings) {
      return { overhead_calculation_basis: 'material_labor', overhead_rate_percent: 0, default_labor_rate_per_hour: 0 };
    }
    return settings.get ? settings.get({ plain: true }) : settings;
  }

  /**
   * Reserva materiais da BOM ao liberar a OP, **vinculando cada reserva a
   * esta OP** (`production_order_reservations`, gap G3 — 2026-08-09).
   *
   * @param order - Ordem travada.
   * @param userId - Usuario executor.
   * @param transaction - Transacao ativa.
   * @returns void
   */
  private async reserveMaterials(order: any, userId: number, transaction: any): Promise<void> {
    const availability = await BomService.checkAvailability(order.product_id, Number(order.quantity));
    if (!availability.available) {
      throw new BusinessRuleError(
        `Nao e possivel liberar a OP ${order.order_number} sem material disponivel.`,
        {
          production_order_id: order.id,
          requested_quantity: order.quantity,
          max_possible_quantity: availability.max_possible_quantity,
          missing_items: availability.missing_items
        }
      );
    }

    const explosion = await BomService.explodeBOM(order.product_id, Number(order.quantity), { includeCost: false });
    for (const component of explosion.components) {
      await InventoryService.reserve(component.component_id, component.quantity, userId, transaction, {
        productionOrderId: order.id,
        description: `Reserva de componente - Producao ${order.order_number}`,
        referenceId: order.id,
        referenceType: 'production'
      });
    }
  }

  /**
   * Libera o material reservado por ESTA OP quando ela e cancelada.
   *
   * @param order - Ordem travada.
   * @param userId - Usuario executor.
   * @param transaction - Transacao ativa.
   * @param description - Motivo da liberacao.
   * @returns void
   */
  private async releaseMaterialsIfReserved(order: any, userId: number, transaction: any, description: string): Promise<void> {
    if (!['released', 'in_progress', 'paused'].includes(order.status)) {
      return;
    }

    await this.releaseOwnReservations(order, userId, transaction, description);
  }

  /**
   * Libera integralmente o saldo reservado desta OP — e apenas dela.
   *
   * Gap G3 (2026-08-09). Substitui as duas rotinas anteriores
   * (`releaseMaterialsIfReserved` reexplodindo a BOM no cancelamento e
   * `releaseReservationsForQuantity` reexplodindo duas vezes na conclusao),
   * que tinham dois defeitos graves:
   *
   * 1. **Canibalizacao**: a liberacao caia em `releaseReservedQuantity`, que
   *    fazia `MIN(products.reserved_quantity, desejado)` sobre o contador
   *    GLOBAL do produto — ou seja, uma OP liberava (e em seguida consumia)
   *    material reservado por outra OP;
   * 2. **Reserva presa**: a quantidade a liberar era recalculada explodindo a
   *    BOM de novo. Se a estrutura do produto mudasse entre a liberacao da OP
   *    e a conclusao/cancelamento, a diferenca ficava reservada para sempre.
   *
   * Agora a origem do numero e a propria reserva persistida
   * (`production_order_reservations`), que registra o que aquela OP de fato
   * reservou. Nao depende mais da BOM atual, e por construcao nao alcanca a
   * reserva de nenhuma outra ordem.
   *
   * Sobre-producao (produzido > planejado) continua permitida: o excedente
   * consome estoque livre e e validado por `InventoryService.consume`.
   *
   * @param order - Ordem travada.
   * @param userId - Usuario executor (vem do JWT).
   * @param transaction - Transacao ativa.
   * @param description - Motivo da liberacao, gravado na movimentacao.
   * @returns void
   */
  private async releaseOwnReservations(order: any, userId: number, transaction: any, description: string): Promise<void> {
    await InventoryService.releaseAllReservationsForOrder(order.id, userId, transaction, {
      description,
      referenceId: order.id,
      referenceType: 'production'
    });
  }

  /**
   * Exige payload explicito de consumo por lote quando a OP tem componentes.
   *
   * @param components - Componentes da BOM explodida.
   * @param lotConsumptions - Payload recebido.
   * @returns void
   */
  private assertTrackedConsumptionInput(components: any[], lotConsumptions?: ChangeProductionOrderStatusInput['lot_consumptions']): void {
    if (components.length === 0) {
      return;
    }

    if (!lotConsumptions || lotConsumptions.length === 0) {
      throw new ValidationError('Conclusao da OP exige lot_consumptions explicitos para rastreabilidade dos insumos.');
    }

    const providedProducts = new Set(lotConsumptions.map((item) => Number(item.product_id)));
    const missingProducts = components
      .map((component) => component.component_id)
      .filter((componentId) => !providedProducts.has(componentId));

    if (missingProducts.length > 0) {
      throw new ValidationError('Conclusao da OP exige consumo rastreavel por lote para todos os componentes.', {
        missing_product_ids: missingProducts
      });
    }
  }

  /**
   * Agrupa consumos de lote informados por produto.
   *
   * @param lotConsumptions - Payload opcional recebido do controller.
   * @returns Mapa por produto.
   */
  private normalizeLotConsumptions(lotConsumptions?: ChangeProductionOrderStatusInput['lot_consumptions']): Map<number, Array<{ lot_control_id: number; quantity: number; notes?: string }>> {
    const grouped = new Map<number, Array<{ lot_control_id: number; quantity: number; notes?: string }>>();
    for (const row of lotConsumptions ?? []) {
      const productId = Number(row.product_id);
      const lotControlId = Number(row.lot_control_id);
      const quantity = parseFloat(String(row.quantity));
      if (!Number.isFinite(productId) || !Number.isFinite(lotControlId) || !Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError('lot_consumptions deve conter product_id, lot_control_id e quantity validos.');
      }
      const current = grouped.get(productId) ?? [];
      current.push({ lot_control_id: lotControlId, quantity, notes: row.notes });
      grouped.set(productId, current);
    }
    return grouped;
  }

  /**
   * Consome lotes de um componente, usando payload explicito ou FIFO.
   *
   * @param params - Contexto de consumo.
   * @returns void
   */
  private async consumeLotsForComponent(params: {
    order: any;
    productId: number;
    quantity: number;
    userId: number;
    transaction: any;
    requestedConsumptions: Array<{ lot_control_id: number; quantity: number; notes?: string }>;
  }): Promise<void> {
    const requested = params.requestedConsumptions;
    let remaining = params.quantity;

    if (requested.length > 0) {
      const requestedTotal = requested.reduce((sum, entry) => sum + entry.quantity, 0);
      if (Math.abs(requestedTotal - params.quantity) > 0.0001) {
        throw new BusinessRuleError(`Consumo por lote do produto ${params.productId} difere da quantidade exigida pela OP.`);
      }
      for (const entry of requested) {
        const lot = await LotControl.findOne({
          where: { id: entry.lot_control_id, product_id: params.productId },
          transaction: params.transaction,
          lock: params.transaction.LOCK.UPDATE
        });
        if (!lot) {
          throw new NotFoundError(`Lote ${entry.lot_control_id} do produto ${params.productId} nao encontrado.`);
        }
        if (lot.status !== 'available') {
          throw new BusinessRuleError(`Lote ${lot.lot_number} do produto ${params.productId} nao esta disponivel para consumo (status atual: '${lot.status}').`);
        }
        if (lot.expires_at && new Date(lot.expires_at) < new Date()) {
          throw new BusinessRuleError(`Lote ${lot.lot_number} do produto ${params.productId} esta vencido (validade ${lot.expires_at}) e nao pode ser consumido em producao.`);
        }
        await this.applyLotConsumption({
          lot,
          quantity: entry.quantity,
          orderId: params.order.id,
          productId: params.productId,
          userId: params.userId,
          transaction: params.transaction,
          notes: entry.notes ?? `Consumo OP ${params.order.order_number}`
        });
      }
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const candidateLots = await LotControl.findAll({
      where: {
        product_id: params.productId,
        status: 'available',
        // FEFO real (First-Expired-First-Out): exclui lotes vencidos do
        // consumo automatico. Sem expires_at (null) e tratado como "sem
        // validade definida" e ordenado por ultimo.
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gte]: today } }]
      },
      transaction: params.transaction,
      lock: params.transaction.LOCK.UPDATE,
      order: [
        [sequelize.literal('expires_at IS NULL'), 'ASC'],
        ['expires_at', 'ASC'],
        ['received_at', 'ASC'],
        ['manufactured_at', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    for (const lot of candidateLots) {
      if (remaining <= 0) break;
      const available = parseFloat(String(lot.quantity_available || 0));
      if (available <= 0) continue;
      const toConsume = Math.min(available, remaining);
      await this.applyLotConsumption({
        lot,
        quantity: toConsume,
        orderId: params.order.id,
        productId: params.productId,
        userId: params.userId,
        transaction: params.transaction,
        notes: `Consumo FIFO OP ${params.order.order_number}`
      });
      remaining -= toConsume;
    }

    if (remaining > 0.0001) {
      throw new BusinessRuleError(`Nao ha lotes suficientes para rastrear o consumo do produto ${params.productId} na OP ${params.order.order_number}.`);
    }
  }

  /**
   * Aplica consumo em um lote e persiste a linha de rastreabilidade.
   *
   * @param params - Dados do consumo.
   * @returns void
   */
  private async applyLotConsumption(params: {
    lot: any;
    quantity: number;
    orderId: number;
    productId: number;
    userId: number;
    transaction: any;
    notes: string;
  }): Promise<void> {
    const available = parseFloat(String(params.lot.quantity_available || 0));
    if (available + 0.0001 < params.quantity) {
      throw new BusinessRuleError(`Lote ${params.lot.lot_number} sem saldo suficiente para consumo.`);
    }

    const nextAvailable = available - params.quantity;
    await params.lot.update({
      quantity_available: nextAvailable,
      status: nextAvailable <= 0.0001 ? 'consumed' : 'available'
    }, { transaction: params.transaction });

    await ProductionLotConsumption.create({
      production_order_id: params.orderId,
      lot_control_id: params.lot.id,
      product_id: params.productId,
      quantity_consumed: params.quantity,
      consumed_at: new Date(),
      user_id: params.userId,
      notes: params.notes
    }, { transaction: params.transaction });
  }

  /**
   * Cria o lote do produto acabado gerado pela OP.
   *
   * @param params - Dados da producao concluida.
   * @returns Lote criado.
   */
  private async createFinishedLot(params: {
    order: any;
    producedQty: number;
    userId: number;
    transaction: any;
    finishedLotNumber?: string;
    warehouseId?: number | null;
  }): Promise<any> {
    const lotNumber = params.finishedLotNumber?.trim() || `${params.order.order_number}-FG`;
    return LotControl.create({
      product_id: params.order.product_id,
      production_order_id: params.order.id,
      lot_number: lotNumber,
      status: 'available',
      warehouse_id: params.warehouseId ?? null,
      quantity_initial: params.producedQty,
      quantity_available: params.producedQty,
      manufactured_at: new Date(),
      created_by: params.userId,
      notes: `Produto acabado gerado pela OP ${params.order.order_number}`
    }, { transaction: params.transaction });
  }

  /**
   * Persiste numeros de serie do produto acabado quando informados.
   *
   * @param params - Dados seriais.
   * @returns void
   */
  private async createSerialNumbersIfNeeded(params: {
    order: any;
    lotControlId: number;
    serialNumbers?: string[];
    userId: number;
    transaction: any;
  }): Promise<void> {
    const serialNumbers = (params.serialNumbers ?? [])
      .map((serial) => String(serial).trim())
      .filter((serial) => serial.length > 0);

    if (serialNumbers.length === 0) return;

    const uniqueSerials = new Set(serialNumbers);
    if (uniqueSerials.size !== serialNumbers.length) {
      throw new ValidationError('serial_numbers nao pode conter valores duplicados.');
    }

    for (const serialNumber of serialNumbers) {
      await SerialNumber.create({
        product_id: params.order.product_id,
        lot_control_id: params.lotControlId,
        production_order_id: params.order.id,
        serial_number: serialNumber,
        status: 'available',
        manufactured_at: new Date(),
        notes: `Serie gerada na OP ${params.order.order_number} por usuario ${params.userId}`
      }, { transaction: params.transaction });
    }
  }
}

export = ChangeProductionOrderStatusUseCase;


