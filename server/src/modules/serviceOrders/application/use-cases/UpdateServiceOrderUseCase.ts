/**
 * Use case: atualizar uma ordem de serviço existente.
 *
 * @module modules/serviceOrders/application/use-cases/UpdateServiceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ServiceOrdersRepository from '../../domain/repositories/ServiceOrdersRepository';

const ALLOWED_FIELDS = [
  'diagnosed_issue',
  'service_performed',
  'labor_cost',
  'total_amount',
  'status',
  'priority',
  'technician_id',
  'responsible_id',
  'notes',
  'completion_date',
  'delivery_date',
  'warranty_days'
];

interface UpdateServiceOrderInput {
  id: number | string;
  body: Record<string, unknown>;
}

class UpdateServiceOrderUseCase extends UseCase<UpdateServiceOrderInput, any> {
  private readonly serviceOrdersRepository: ServiceOrdersRepository;

  /** @param serviceOrdersRepository - Repositorio de ordens de serviço. */
  public constructor(serviceOrdersRepository: ServiceOrdersRepository) {
    super();
    this.serviceOrdersRepository = serviceOrdersRepository;
  }

  /**
   * @param input - Id da ordem e campos a atualizar (apenas os permitidos).
   * @returns Ordem de serviço atualizada.
   * @throws {NotFoundError} Se a ordem não existir.
   */
  public async execute({ id, body }: UpdateServiceOrderInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.status === 'completed' && !updateData.completion_date) updateData.completion_date = new Date();

    const updated = await this.serviceOrdersRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError('Ordem de serviço não encontrada');
    }
    return this.serviceOrdersRepository.findById(id);
  }
}

export = UpdateServiceOrderUseCase;
