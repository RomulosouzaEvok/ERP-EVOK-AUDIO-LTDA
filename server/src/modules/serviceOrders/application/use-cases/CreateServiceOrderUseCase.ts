/**
 * Use case: criar uma nova ordem de serviço.
 *
 * @module modules/serviceOrders/application/use-cases/CreateServiceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import ServiceOrdersRepository from '../../domain/repositories/ServiceOrdersRepository';

interface CreateServiceOrderInput {
  client_id?: number;
  product_id?: number;
  equipment_desc?: string;
  reported_issue?: string;
  priority?: string;
  technician_id?: number;
  responsible_id?: number;
  notes?: string;
}

class CreateServiceOrderUseCase extends UseCase<CreateServiceOrderInput, any> {
  private readonly serviceOrdersRepository: ServiceOrdersRepository;

  /** @param serviceOrdersRepository - Repositorio de ordens de serviço. */
  public constructor(serviceOrdersRepository: ServiceOrdersRepository) {
    super();
    this.serviceOrdersRepository = serviceOrdersRepository;
  }

  /**
   * @param input - Dados da ordem de serviço (client_id obrigatório).
   * @returns Ordem de serviço criada, com `order_number` gerado automaticamente.
   * @throws {ValidationError} Se `client_id` estiver ausente.
   */
  public async execute(input: CreateServiceOrderInput): Promise<any> {
    const { client_id, product_id, equipment_desc, reported_issue, priority, technician_id, responsible_id, notes } =
      input;

    if (!client_id) {
      throw new ValidationError('Cliente é obrigatório');
    }

    return this.serviceOrdersRepository.create({
      order_number: `OS-${Date.now()}`,
      client_id,
      product_id,
      equipment_desc,
      reported_issue,
      priority: priority || 'normal',
      technician_id,
      responsible_id,
      notes,
      status: 'open',
      entry_date: new Date()
    });
  }
}

export = CreateServiceOrderUseCase;
