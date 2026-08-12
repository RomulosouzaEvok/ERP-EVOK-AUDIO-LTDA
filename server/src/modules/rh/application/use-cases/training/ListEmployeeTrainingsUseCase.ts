/**
 * `GET /api/rh/employee-trainings` — filtros `employee_id`/`training_course_id`/`expiring_in_days`/`department_id`.
 * @module modules/rh/application/use-cases/training/ListEmployeeTrainingsUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import EmployeeTrainingRepository from '../../../domain/repositories/EmployeeTrainingRepository';

interface ListEmployeeTrainingsInput {
  employee_id?: number;
  training_course_id?: number;
  expiring_in_days?: number;
  department_id?: number;
  page?: number;
  limit?: number;
}

class ListEmployeeTrainingsUseCase extends UseCase<ListEmployeeTrainingsInput, any> {
  private readonly employeeTrainingRepository: EmployeeTrainingRepository;

  public constructor(employeeTrainingRepository: EmployeeTrainingRepository) {
    super();
    this.employeeTrainingRepository = employeeTrainingRepository;
  }

  public async execute(input: ListEmployeeTrainingsInput): Promise<any> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { count, rows } = await this.employeeTrainingRepository.findAndCount(
      {
        employee_id: input.employee_id,
        training_course_id: input.training_course_id,
        expiring_in_days: input.expiring_in_days,
        department_id: input.department_id,
      },
      { limit, offset: (page - 1) * limit },
    );
    return { count, rows, page, limit, totalPages: Math.ceil(count / limit) || 1 };
  }
}

export = ListEmployeeTrainingsUseCase;
