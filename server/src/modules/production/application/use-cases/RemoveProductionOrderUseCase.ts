/**
 * Use case: remover OP.
 *
 * @module modules/production/application/use-cases/RemoveProductionOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';

class RemoveProductionOrderUseCase extends UseCase<{ id: number }, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Remove uma OP quando seu status permite e ela nao segura material.
   *
   * @param input - ID da OP.
   * @returns OP removida no estado anterior.
   * @throws {NotFoundError} Se a OP nao existir.
   * @throws {BusinessRuleError} Se a OP estiver em andamento/concluida ou ainda tiver material reservado.
   */
  public async execute(input: { id: number }): Promise<any> {
    const order = await this.productionOrderRepository.findRawById(input.id);
    if (!order) throw new NotFoundError('Ordem de producao nao encontrada');
    if (['in_progress', 'completed'].includes(order.status)) {
      throw new BusinessRuleError('Ordens em andamento ou concluidas nao podem ser removidas');
    }

    // Gap G3 (2026-08-09): uma OP `released` segura material em
    // `production_order_reservations`, cuja FK e `ON DELETE CASCADE`.
    // Apagar a OP direto levaria as reservas junto e deixaria o cache
    // `products.reserved_quantity` alto para sempre — material invisivelmente
    // indisponivel para todo o resto da fabrica. Antes desta correcao o
    // mesmo vazamento ja acontecia (o contador global nunca era devolvido),
    // so que sem nenhum aviso.
    const activeReservations = await this.productionOrderRepository.countActiveMaterialReservations(input.id);
    if (activeReservations > 0) {
      throw new BusinessRuleError(
        `A OP ${order.order_number} ainda tem ${activeReservations} reserva(s) de material ativa(s) e nao pode ser removida. `
        + 'Cancele a OP primeiro (status `canceled`) — o cancelamento devolve o material ao estoque disponivel — e so entao remova.',
        { rule: 'G3', production_order_id: input.id, active_reservations: activeReservations },
      );
    }

    await this.productionOrderRepository.destroy(input.id);
    return order;
  }
}

export = RemoveProductionOrderUseCase;
