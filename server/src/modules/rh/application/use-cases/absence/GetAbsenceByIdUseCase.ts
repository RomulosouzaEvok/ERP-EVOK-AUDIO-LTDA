/**
 * `GET /api/rh/absences/:id` — detalhe de um afastamento.
 * @module modules/rh/application/use-cases/absence/GetAbsenceByIdUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AbsenceRepository from '../../../domain/repositories/AbsenceRepository';

interface GetAbsenceByIdInput {
  id: number | string;
}

class GetAbsenceByIdUseCase extends UseCase<GetAbsenceByIdInput, any> {
  private readonly absenceRepository: AbsenceRepository;

  public constructor(absenceRepository: AbsenceRepository) {
    super();
    this.absenceRepository = absenceRepository;
  }

  /** @throws {NotFoundError} Afastamento não existe (404). */
  public async execute(input: GetAbsenceByIdInput): Promise<any> {
    const absence = await this.absenceRepository.findById(input.id);
    if (!absence) throw new NotFoundError('Afastamento não encontrado.');
    return absence;
  }
}

export = GetAbsenceByIdUseCase;
