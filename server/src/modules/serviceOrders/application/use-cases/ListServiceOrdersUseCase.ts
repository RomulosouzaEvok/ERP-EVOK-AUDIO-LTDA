/**
 * Use case: listar ordens de serviço com filtros e paginacao.
 *
 * @module modules/serviceOrders/application/use-cases/ListServiceOrdersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ServiceOrdersRepository from '../../domain/repositories/ServiceOrdersRepository';

interface ListServiceOrdersInput {
  page?: string | number;
  limit?: string | number;
  status?: string;
  client_id?: string | number;
}

interface ListServiceOrdersOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListServiceOrdersUseCase extends UseCase<ListServiceOrdersInput, ListServiceOrdersOutput> {
  private readonly serviceOrdersRepository: ServiceOrdersRepository;

  /** @param serviceOrdersRepository - Repositorio de ordens de serviço. */
  public constructor(serviceOrdersRepository: ServiceOrdersRepository) {
    super();
    this.serviceOrdersRepository = serviceOrdersRepository;
  }

  /**
   * @param input - Filtros e paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListServiceOrdersInput): Promise<ListServiceOrdersOutput> {
    const { page = '1', limit = '10', status, client_id } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.serviceOrdersRepository.findAndCountAll(
      { status, client_id },
      { limit: l, offset: o }
    );

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListServiceOrdersUseCase;
