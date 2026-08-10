/**
 * `PATCH /api/rh/termination-processes/:id/esocial-confirmation` — `s2299_confirmed_at`.
 * @module modules/rh/application/use-cases/termination/ConfirmTerminationEsocialUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';

class ConfirmTerminationEsocialUseCase extends UseCase<{ id: number | string; confirmedBy: number }, any> {
  private readonly repository: TerminationProcessRepository;

  public constructor(repository: TerminationProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id, confirmedBy }: { id: number | string; confirmedBy: number }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    return this.repository.update(id, { s2299_confirmed_at: new Date(), s2299_confirmed_by: confirmedBy });
  }
}

export = ConfirmTerminationEsocialUseCase;
