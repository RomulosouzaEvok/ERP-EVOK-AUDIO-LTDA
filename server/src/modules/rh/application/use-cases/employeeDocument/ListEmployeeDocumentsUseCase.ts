/**
 * `GET /api/rh/employee-documents` — filtros `employee_id`/`doc_type`/`expiring_in_days` (RF-RH-029).
 * @module modules/rh/application/use-cases/employeeDocument/ListEmployeeDocumentsUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';

class ListEmployeeDocumentsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: EmployeeDocumentRepository;

  public constructor(repository: EmployeeDocumentRepository) {
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

export = ListEmployeeDocumentsUseCase;
