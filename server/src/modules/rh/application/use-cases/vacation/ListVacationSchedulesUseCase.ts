/**
 * `GET /api/rh/vacation-schedules` — §8.1 do contrato de API. Filtros
 * `employee_id`/`accrual_period_id`/`department_id`.
 *
 * @module modules/rh/application/use-cases/vacation/ListVacationSchedulesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import VacationScheduleRepository from '../../../domain/repositories/VacationScheduleRepository';

class ListVacationSchedulesUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: VacationScheduleRepository;

  public constructor(repository: VacationScheduleRepository) {
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

export = ListVacationSchedulesUseCase;
