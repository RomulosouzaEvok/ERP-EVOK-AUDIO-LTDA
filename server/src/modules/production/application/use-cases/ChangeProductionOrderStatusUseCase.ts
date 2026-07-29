/**
 * Use case: alterar status da OP.
 *
 * @module modules/production/application/use-cases/ChangeProductionOrderStatusUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ProductionOrderEntity from '../../domain/entities/ProductionOrderEntity';
import { NotFoundError, ValidationError, ConflictError } from '../../../../errors';
const InventoryService: any = require('../../../../services/inventoryService');
const CostingService: any = require('../../../../services/costingService');
const BomService: any = require('../../../../services/bomService');
import { sequelize } from '../../../../config/database';

interface ChangeProductionOrderStatusInput {
  id: number;
  status: string;
  quantity_produced?: number;
  allow_overproduction?: boolean;
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
        allowOverproduction: !!input.allow_overproduction
      });

      if (input.status === 'completed') {
        await this.completeOrder(order, updateData.quantity_produced || 0, input.user_id, t);
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
   * Completa a OP consumindo componentes, recebendo produto acabado e registrando custo real.
   *
   * @param order - OP travada.
   * @param producedQty - Quantidade produzida.
   * @param userId - Usuario executor.
   * @param transaction - Transacao ativa.
   * @returns void
   * @throws {ConflictError} Se estoque/custo falhar.
   */
  private async completeOrder(order: any, producedQty: number, userId: number, transaction: any): Promise<void> {
    if (producedQty <= 0) return;

    try {
      let explosion: any = null;
      try {
        explosion = await BomService.explodeBOM(order.product_id, producedQty, { includeCost: true });
      } catch (bomError: any) {
        if (bomError.statusCode !== 404) throw bomError;
      }

      if (explosion) {
        for (const component of explosion.components) {
          await InventoryService.consume(component.component_id, component.quantity, transaction, {
            user_id: userId,
            description: `Consumo de componente - Producao ${order.order_number}`,
            reference_id: order.id,
            reference_type: 'production',
            unit_cost: component.unit_cost || 0
          });
        }
      }

      const totalCost = explosion ? parseFloat(explosion.total_cost || 0) : 0;
      const unitCost = producedQty > 0 ? totalCost / producedQty : 0;
      const { product } = await InventoryService.receive(order.product_id, producedQty, transaction, {
        user_id: userId,
        description: `Producao concluida - ${order.order_number}`,
        reference_id: order.id,
        reference_type: 'production',
        unit_cost: unitCost
      });

      await CostingService.registerWeightedAverageCost({
        product,
        quantity: producedQty,
        unitCost,
        sourceType: 'production',
        sourceId: order.id,
        userId,
        notes: `Custo real de producao - ${order.order_number}`
      }, transaction);
    } catch (stockError: any) {
      throw new ConflictError(stockError.message);
    }
  }
}

export = ChangeProductionOrderStatusUseCase;
