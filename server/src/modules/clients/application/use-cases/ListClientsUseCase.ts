/**
 * Use case: listar clientes.
 *
 * @module modules/clients/application/use-cases/ListClientsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
const Validators: any = require('../../../../utils/validators');
import ClientsRepository from '../../domain/repositories/ClientsRepository';

interface ListClientsInput {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

interface ListClientsOutput {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListClientsUseCase extends UseCase<ListClientsInput, ListClientsOutput> {
  private readonly clientsRepository: ClientsRepository;

  /** @param clientsRepository - Repositorio de clientes. */
  public constructor(clientsRepository: ClientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param input - Filtros e paginacao.
   * @returns Clientes paginados.
   */
  public async execute({ search, status, page, limit }: ListClientsInput): Promise<ListClientsOutput> {
    const offset = (page - 1) * limit;
    const sanitized = search ? Validators.sanitizeSearch(search) : undefined;

    const { count, rows } = await this.clientsRepository.list({
      limit, offset, search: sanitized, status
    });

    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListClientsUseCase;
