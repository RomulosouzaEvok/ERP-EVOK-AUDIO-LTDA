/**
 * `GET /api/rh/admission-processes` — lista paginada, filtros `status`/`department_id`.
 * @module modules/rh/application/use-cases/admission/ListAdmissionProcessesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

class ListAdmissionProcessesUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute(filters: Record<string, any>): Promise<any> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset: (page - 1) * limit });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAdmissionProcessesUseCase;
