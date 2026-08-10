/**
 * `GET /api/rh/termination-processes/:id` — detalhe + checklist de ativos.
 * @module modules/rh/application/use-cases/termination/GetTerminationProcessByIdUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';

class GetTerminationProcessByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: TerminationProcessRepository;

  public constructor(repository: TerminationProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id }: { id: number | string }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    return process;
  }
}

export = GetTerminationProcessByIdUseCase;
