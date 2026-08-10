/**
 * Use case: fechar (soft delete) uma não conformidade.
 *
 * @module modules/nonConformities/application/use-cases/CloseNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
import { CLOSED_STATUS, buildClosureFields } from '../../domain/closure';

interface CloseNonConformityInput {
  id: number | string;
  /** Id do usuário autenticado (`req.user.id`) — sempre do JWT, nunca do body. */
  closedBy: number;
}

class CloseNonConformityUseCase extends UseCase<CloseNonConformityInput, { message: string }> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Id da não conformidade e id do usuário autenticado que a encerra.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o registro não existir.
   *
   * @remarks
   * Segunda ocorrência do mesmo defeito do `UpdateNonConformityUseCase`,
   * encontrada ao varrer o módulo em 2026-08-10 (a auditoria só havia
   * apontado a primeira): este caminho gravava **apenas** `status = 'closed'`,
   * sem `closed_date` e sem `closed_by`. O sintoma visível é idêntico — RNC
   * encerrada sem data nem responsável, contrariando ISO 9001:2015 §8.7/§10.2
   * — e a rota é a mais fácil de acionar por engano (`DELETE`), então na
   * prática era a que mais tendia a produzir o dado incompleto.
   *
   * Os dois caminhos agora derivam os campos de encerramento da MESMA função
   * (`domain/closure.buildClosureFields`), para que um terceiro caminho não
   * reintroduza a divergência.
   */
  public async execute({ id, closedBy }: CloseNonConformityInput): Promise<{ message: string }> {
    const updated = await this.nonConformitiesRepository.update(id, {
      status: CLOSED_STATUS,
      ...buildClosureFields(closedBy),
    });
    if (!updated) {
      throw new NotFoundError('Não conformidade não encontrada');
    }
    return { message: 'Não conformidade fechada' };
  }
}

export = CloseNonConformityUseCase;
