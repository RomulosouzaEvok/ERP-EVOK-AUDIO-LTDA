/**
 * Use case: inativar cliente.
 *
 * @module modules/clients/application/use-cases/DeactivateClientUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../errors';
import ClientsRepository from '../../domain/repositories/ClientsRepository';

interface DeactivateClientInput {
  id: number;
}

class DeactivateClientUseCase extends UseCase<DeactivateClientInput, { message: string }> {
  private readonly clientsRepository: ClientsRepository;

  /** @param clientsRepository - Repositorio de clientes. */
  public constructor(clientsRepository: ClientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param input - Id do cliente.
   * @returns Mensagem de confirmacao.
   * @throws {ValidationError} Se houver vendas ativas.
   * @throws {NotFoundError} Se o id nao existir.
   */
  public async execute({ id }: DeactivateClientInput): Promise<{ message: string }> {
    const activeSales = await this.clientsRepository.countActiveSales(id);
    if (activeSales > 0) {
      throw new ValidationError(`Cliente possui ${activeSales} venda(s) ativa(s). Não é possível inativar.`);
    }

    const updated = await this.clientsRepository.update(id, { status: 'inactive' });
    if (!updated) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return { message: 'Cliente inativado com sucesso' };
  }
}

export = DeactivateClientUseCase;
