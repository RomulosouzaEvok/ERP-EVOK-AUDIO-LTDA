/**
 * Use case: buscar ordem de serviço por id.
 *
 * @module modules/serviceOrders/application/use-cases/GetServiceOrderByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ServiceOrdersRepository from '../../domain/repositories/ServiceOrdersRepository';

class GetServiceOrderByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly serviceOrdersRepository: ServiceOrdersRepository;

  /** @param serviceOrdersRepository - Repositorio de ordens de serviço. */
  public constructor(serviceOrdersRepository: ServiceOrdersRepository) {
    super();
    this.serviceOrdersRepository = serviceOrdersRepository;
  }

  /**
   * @param input - Id da ordem de serviço.
   * @returns Ordem de serviço encontrada.
   * @throws {NotFoundError} Se a ordem não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const order = await this.serviceOrdersRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Ordem de serviço não encontrada');
    }
    return order;
  }
}

export = GetServiceOrderByIdUseCase;
