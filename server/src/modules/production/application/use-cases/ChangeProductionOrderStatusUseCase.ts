/**
 * Use case: alterar status da OP.
 *
 * @module modules/production/application/use-cases/ChangeProductionOrderStatusUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ProductionOrderEntity from '../../domain/entities/ProductionOrderEntity';
import { NotFoundError, ValidationError, ConflictError, BusinessRuleError, AppError } from '../../../../errors';
const InventoryService: any = require('../../../../services/inventoryService');
const WarehouseStockService: any = require('../../../../services/warehouseStockService');
const CostingService: any = require('../../../../services/costingService');
const BomService: any = require('../../../../services/bomService');
const { LotControl, ProductionLotConsumption, SerialNumber }: any = require('../../../../models/index');
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
      }

      if (input.status === 'completed') {
        await this.reconcileTrackingOnCompletion(order, updateData.quantity_produced || 0, t);
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
   * Reconcilia apontamentos de etapa com a conclusao da OP.
   *
   * Regras (aplicadas apenas quando a OP possui apontamentos):
   * - Nenhuma etapa pode estar aberta (pending/in_progress/paused);
   * - quantity_produced nao pode exceder o quantity_good da ultima etapa
   *   concluida, pois a saida boa do processo e limitada pela etapa final.
   *
   * @param order - OP travada.
   * @param producedQty - Quantidade produzida declarada na conclusao.
   * @param transaction - Transacao ativa.
   * @returns void
   * @throws {BusinessRuleError} Se houver etapa aberta ou quantidade divergente.
   */
  private async reconcileTrackingOnCompletion(order: any, producedQty: number, transaction: any): Promise<void> {
    const trackings = await this.productionOrderRepository.listTrackingByOrderForUpdate(order.id, transaction);
    if (!trackings || trackings.length === 0) {
      return; // OP sem apontamento por etapa: fluxo simples permanece valido.
    }

    const openSteps = trackings.filter((step: any) => !['completed', 'skipped'].includes(step.status));
    if (openSteps.length > 0) {
      throw new BusinessRuleError(
        `OP ${order.order_number} nao pode ser concluida com ${openSteps.length} etapa(s) de apontamento em aberto.`,
        { open_steps: openSteps.map((step: any) => ({ id: step.id, sequence: step.sequence, status: step.status })) }
      );
    }

    const completedSteps = trackings.filter((step: any) => step.status === 'completed');
    if (completedSteps.length === 0) {
      return; // Todas puladas: sem quantidade apontada para reconciliar.
    }

    const lastStep = completedSteps[completedSteps.length - 1];
    const lastGood = parseFloat(String(lastStep.quantity_good || 0));
    if (producedQty > lastGood + 0.0001) {
      throw new BusinessRuleError(
        `quantity_produced (${producedQty}) excede a quantidade boa apontada na ultima etapa (${lastGood}) da OP ${order.order_number}.`,
        { last_step_sequence: lastStep.sequence, last_step_quantity_good: lastGood, quantity_produced: producedQty }
      );
    }
  }

  /**
   * Completa a OP consumindo componentes, recebendo produto acabado e registrando custo real.
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
    if (producedQty <= 0) return;

    try {
      // Roteamento de deposito (Bloco 4, BUSINESS_RULES.md §12 item 7):
      // consumo de componentes sai sempre de INSUMOS; produto acabado
      // concluido entra sempre em ACABADOS.
      const insumosWarehouse = await WarehouseStockService.getWarehouseByCode('INSUMOS', transaction);
      const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

      let explosion: any = null;
      try {
        explosion = await BomService.explodeBOM(order.product_id, producedQty, { includeCost: true });
      } catch (bomError: any) {
        if (bomError.statusCode !== 404) throw bomError;
      }

      if (explosion) {
        this.assertTrackedConsumptionInput(explosion.components, input.lot_consumptions);
        if (['released', 'in_progress', 'paused'].includes(previousStatus)) {
          await this.releaseReservationsForQuantity(order, input.user_id, producedQty, transaction);
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
   * Reserva materiais da BOM ao liberar a OP.
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
        description: `Reserva de componente - Producao ${order.order_number}`,
        referenceId: order.id,
        referenceType: 'production'
      });
    }
  }

  /**
   * Libera reservas inteiras da quantidade planejada quando a OP e cancelada.
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

    const explosion = await BomService.explodeBOM(order.product_id, Number(order.quantity), { includeCost: false });
    for (const component of explosion.components) {
      await this.releaseReservedQuantity(component.component_id, component.quantity, order.id, userId, transaction, description);
    }
  }

  /**
   * Libera a reserva planejada antes do consumo real da conclusao.
   *
   * @param order - Ordem travada.
   * @param userId - Usuario executor.
   * @param producedQty - Quantidade real produzida.
   * @param transaction - Transacao ativa.
   * @returns void
   */
  private async releaseReservationsForQuantity(order: any, userId: number, producedQty: number, transaction: any): Promise<void> {
    const plannedExplosion = await BomService.explodeBOM(order.product_id, Number(order.quantity), { includeCost: false });
    const actualExplosion = await BomService.explodeBOM(order.product_id, producedQty, { includeCost: false });
    const actualByComponent = new Map<number, number>();

    for (const component of actualExplosion.components) {
      actualByComponent.set(component.component_id, component.quantity);
    }

    for (const component of plannedExplosion.components) {
      const actualQty = actualByComponent.get(component.component_id) ?? 0;
      const quantityToRelease = Math.max(component.quantity, actualQty);
      await this.releaseReservedQuantity(
        component.component_id,
        quantityToRelease,
        order.id,
        userId,
        transaction,
        `Liberacao de reserva antes do consumo - Producao ${order.order_number}`
      );
    }
  }

  /**
   * Libera uma quantidade reservada sem falhar quando a reserva real for menor.
   *
   * @param productId - Produto do componente.
   * @param desiredQuantity - Quantidade desejada.
   * @param orderId - Ordem de producao relacionada.
   * @param userId - Usuario executor.
   * @param transaction - Transacao ativa.
   * @param description - Motivo da liberacao.
   * @returns void
   */
  private async releaseReservedQuantity(
    productId: number,
    desiredQuantity: number,
    orderId: number,
    userId: number,
    transaction: any,
    description: string
  ): Promise<void> {
    const product = await this.productionOrderRepository.findProductById(productId, transaction);
    const reservedQuantity = parseFloat(String(product?.reserved_quantity || 0));
    const quantityToRelease = Math.min(reservedQuantity, desiredQuantity);

    if (quantityToRelease <= 0) {
      return;
    }

    await InventoryService.releaseReservation(productId, quantityToRelease, userId, transaction, {
      description,
      referenceId: orderId,
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
