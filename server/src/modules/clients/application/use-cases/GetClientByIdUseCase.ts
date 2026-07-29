/**
 * Use case: buscar cliente por id.
 *
 * @module modules/clients/application/use-cases/GetClientByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ClientsRepository from '../../domain/repositories/ClientsRepository';

interface GetClientByIdInput {
  id: number;
}

class GetClientByIdUseCase extends UseCase<GetClientByIdInput, any> {
  private readonly clientsRepository: ClientsRepository;

  /** @param clientsRepository - Repositorio de clientes. */
  public constructor(clientsRepository: ClientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param input - Id do cliente.
   * @returns Cliente encontrado.
   * @throws {NotFoundError} Se o id nao existir.
   */
  public async execute({ id }: GetClientByIdInput): Promise<any> {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundError('Cliente não encontrado');
    }
    return client;
  }
}

export = GetClientByIdUseCase;
