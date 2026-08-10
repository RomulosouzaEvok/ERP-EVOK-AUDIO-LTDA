/**
 * `GET /api/rh/admission-processes/:id` — detalhe + checklist de documentos.
 * @module modules/rh/application/use-cases/admission/GetAdmissionProcessByIdUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

class GetAdmissionProcessByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id }: { id: number | string }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    return process;
  }
}

export = GetAdmissionProcessByIdUseCase;
