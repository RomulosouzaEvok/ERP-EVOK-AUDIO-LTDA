const UseCase = require('../../../../shared/application/UseCase');
const ProductionOrderEntity = require('../../domain/entities/ProductionOrderEntity');
const { NotFoundError, ValidationError, ConflictError } = require('../../../../errors');
const InventoryService = require('../../../../services/inventoryService');
const BomService = require('../../../../services/bomService');
const { sequelize } = require('../../../../config/database');

/**
 * Tabela de transições válidas da máquina de estados de uma Ordem de
 * Produção. Único ponto de verdade — reaproveitado por todas as transições
 * de status (ver decisão de simplificação no README do módulo).
 */
const VALID_TRANSITIONS = ProductionOrderEntity.STATUS_TRANSITIONS;

/**
 * Muda o status de uma ordem de produção, cobrindo `PUT /api/production-orders/:id/status`.
 *
 * Este único use case cobre, de forma unificada, os use cases previstos no
 * `TODO.md` (`ReleaseProductionOrderUseCase`, `StartProductionOrderUseCase`,
 * `PauseProductionOrderUseCase`, `ResumeProductionOrderUseCase`,
 * `CompleteProductionOrderUseCase`, `CancelProductionOrderUseCase` e
 * `RegisterProductionOutputUseCase`) — decisão de simplificação documentada
 * no README do módulo, para não duplicar a mesma tabela `VALID_TRANSITIONS`
 * em seis classes diferentes.
 *
 * Reutiliza, dentro de uma única transação Sequelize com lock pessimista
 * (`SELECT ... FOR UPDATE`) na OP:
 * - `BomService.explodeBOM` para obter os componentes a consumir da BOM ativa do produto;
 * - `InventoryService.consume`/`InventoryService.receive` (já com lock+transação, Fase 4.1)
 *   para o consumo de componentes e a entrada do produto acabado, quando `status === 'completed'`.
 */
class ChangeProductionOrderStatusUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ProductionOrderRepository')} productionOrderRepository */
  constructor(productionOrderRepository) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da OP.
   * @param {string} input.status - Status alvo.
   * @param {number} [input.quantity_produced] - Quantidade efetivamente produzida (usado apenas quando `status === 'completed'`).
   * @param {boolean} [input.allow_overproduction=false] - Confirma explicitamente producao acima da quantidade planejada.
   * @param {number} input.user_id - Id do usuário que está executando a mudança de status (usado nos registros de estoque).
   * @returns {Promise<{ previousStatus: string, orderNumber: string, order: Object, updateData: Object }>}
   * @throws {ValidationError} Se `status` estiver ausente, se já for o status atual, se `quantity_produced` for negativo,
   *   ou se exceder a quantidade planejada sem `allow_overproduction`.
   * @throws {NotFoundError} Se a OP não existir.
   * @throws {BusinessRuleError} Se a transição de status não for permitida pela máquina de estados.
   * @throws {ConflictError} Se o consumo/entrada de estoque falhar (ex.: estoque insuficiente de algum componente).
   */
  async execute({ id, status, quantity_produced, allow_overproduction, user_id }) {
    if (!status) {
      throw new ValidationError('Status é obrigatório');
    }

    const t = await sequelize.transaction();
    try {
      // Lock pessimista na OP: impede que duas requisições concorrentes de
      // finalização (ex.: duplo clique) leiam o mesmo status 'in_progress' e
      // ambas tentem completar a mesma ordem, duplicando entrada de estoque.
      const order = await this.productionOrderRepository.findByIdForUpdate(id, t);
      if (!order) {
        throw new NotFoundError('Ordem de produção não encontrada');
      }
      const previousStatus = order.status;
      const orderNumber = order.order_number;
      const entity = new ProductionOrderEntity(order.get ? order.get({ plain: true }) : order);
      const updateData = entity.transitionTo(status, quantity_produced, { allowOverproduction: !!allow_overproduction });
      if (status === 'completed') {
        await this._completeOrder(order, updateData.quantity_produced, user_id, t);
      }

      await this.productionOrderRepository.update(id, updateData, t);
      await t.commit();

      const updated = await this.productionOrderRepository.findByIdWithProductSummary(id);
      return { previousStatus, orderNumber, order: updated, updateData };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Trata a transição para `completed`: registro da quantidade produzida
   * (`RegisterProductionOutputUseCase`, incorporado aqui), consumo dos
   * componentes da BOM ativa e entrada do produto acabado no estoque.
   *
   * @param {Object} order - OP travada (lock pessimista) na transação corrente.
   * @param {number} producedQty - Quantidade produzida ja validada pela entidade.
   * @param {number} user_id - Id do usuário executando a operação.
   * @param {import('sequelize').Transaction} t - Transação corrente.
   * @returns {Promise<void>}
   * @throws {ValidationError} Se `quantity_produced` for negativo.
   * @throws {ConflictError} Se o estoque de algum componente for insuficiente.
   */
  async _completeOrder(order, producedQty, user_id, t) {
    if (producedQty <= 0) return;

    try {
      // Consome os componentes da BOM ativa do produto acabado, se existir.
      // OPs de produtos sem BOM cadastrada seguem funcionando (apenas dão
      // entrada no produto acabado), pois nem todo produto acabado
      // necessariamente possui BOM registrada nesta fase do projeto.
      let explosion = null;
      try {
        explosion = await BomService.explodeBOM(order.product_id, producedQty, { includeCost: false });
      } catch (bomError) {
        if (bomError.statusCode !== 404) throw bomError;
      }
      if (explosion) {
        for (const component of explosion.components) {
          await InventoryService.consume(component.component_id, component.quantity, t, {
            user_id,
            description: `Consumo de componente - Produção ${order.order_number}`,
            reference_id: order.id,
            reference_type: 'production'
          });
        }
      }

      // Entrada do produto acabado no estoque.
      await InventoryService.receive(order.product_id, producedQty, t, {
        user_id,
        description: `Produção concluída - ${order.order_number}`,
        reference_id: order.id,
        reference_type: 'production'
      });
    } catch (stockError) {
      throw new ConflictError(stockError.message);
    }
  }
}

ChangeProductionOrderStatusUseCase.VALID_TRANSITIONS = VALID_TRANSITIONS;

module.exports = ChangeProductionOrderStatusUseCase;
