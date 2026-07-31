/**
 * Use case: fechar (soft delete) uma não conformidade.
 *
 * @module modules/nonConformities/application/use-cases/CloseNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';

class CloseNonConformityUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Id da não conformidade.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o registro não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.nonConformitiesRepository.update(id, { status: 'closed' });
    if (!updated) {
      throw new NotFoundError('Não conformidade não encontrada');
    }
    return { message: 'Não conformidade fechada' };
  }
}

export = CloseNonConformityUseCase;
