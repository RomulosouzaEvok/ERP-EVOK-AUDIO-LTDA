/**
 * `GET /api/rh/employee-benefits` — filtros `employee_id`/`benefit_type_id`/`enrollment_status`.
 * @module modules/rh/application/use-cases/benefit/ListEmployeeBenefitsUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import EmployeeBenefitRepository from '../../../domain/repositories/EmployeeBenefitRepository';

interface ListEmployeeBenefitsInput {
  employee_id?: number;
  benefit_type_id?: number;
  enrollment_status?: string;
  page?: number;
  limit?: number;
}

class ListEmployeeBenefitsUseCase extends UseCase<ListEmployeeBenefitsInput, any> {
  private readonly employeeBenefitRepository: EmployeeBenefitRepository;

  public constructor(employeeBenefitRepository: EmployeeBenefitRepository) {
    super();
    this.employeeBenefitRepository = employeeBenefitRepository;
  }

  public async execute(input: ListEmployeeBenefitsInput): Promise<any> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { count, rows } = await this.employeeBenefitRepository.findAndCount(
      { employee_id: input.employee_id, benefit_type_id: input.benefit_type_id, enrollment_status: input.enrollment_status },
      { limit, offset: (page - 1) * limit },
    );
    return { count, rows, page, limit, totalPages: Math.ceil(count / limit) || 1 };
  }
}

export = ListEmployeeBenefitsUseCase;
