/**
 * Use case: cancelar uma ordem de serviço.
 *
 * @module modules/serviceOrders/application/use-cases/CancelServiceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ServiceOrdersRepository from '../../domain/repositories/ServiceOrdersRepository';

class CancelServiceOrderUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly serviceOrdersRepository: ServiceOrdersRepository;

  /** @param serviceOrdersRepository - Repositorio de ordens de serviço. */
  public constructor(serviceOrdersRepository: ServiceOrdersRepository) {
    super();
    this.serviceOrdersRepository = serviceOrdersRepository;
  }

  /**
   * @param input - Id da ordem de serviço.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se a ordem não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.serviceOrdersRepository.update(id, { status: 'canceled' });
    if (!updated) {
      throw new NotFoundError('Ordem de serviço não encontrada');
    }
    return { message: 'Ordem de serviço cancelada' };
  }
}

export = CancelServiceOrderUseCase;
