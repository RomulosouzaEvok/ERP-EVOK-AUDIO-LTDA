/**
 * `GET /api/rh/absences` — filtros `employee_id`/`type`/`open`. Paginação
 * no mesmo padrão dos demais grupos do bloco. Sanitização de `cid` é feita
 * na camada de apresentação (`rhSensitiveFields.sanitizeAbsence`), não aqui.
 *
 * @module modules/rh/application/use-cases/absence/ListAbsencesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import AbsenceRepository from '../../../domain/repositories/AbsenceRepository';

interface ListAbsencesInput {
  employee_id?: number;
  type?: string;
  open?: boolean;
  page?: number;
  limit?: number;
}

class ListAbsencesUseCase extends UseCase<ListAbsencesInput, any> {
  private readonly absenceRepository: AbsenceRepository;

  public constructor(absenceRepository: AbsenceRepository) {
    super();
    this.absenceRepository = absenceRepository;
  }

  public async execute(input: ListAbsencesInput): Promise<any> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { count, rows } = await this.absenceRepository.findAndCount(
      { employee_id: input.employee_id, type: input.type, open: input.open },
      { limit, offset: (page - 1) * limit },
    );
    return { count, rows, page, limit, totalPages: Math.ceil(count / limit) || 1 };
  }
}

export = ListAbsencesUseCase;
