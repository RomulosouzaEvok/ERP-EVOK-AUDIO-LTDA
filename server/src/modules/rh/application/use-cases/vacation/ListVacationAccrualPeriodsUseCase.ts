/**
 * `GET /api/rh/vacation-accrual-periods` — filtros `employee_id`/`status`. Aplica dobra a cada linha.
 * @module modules/rh/application/use-cases/vacation/ListVacationAccrualPeriodsUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import { applyDobraIfNeeded } from '../../../domain/services/vacationAccrualAutoExpire';

class ListVacationAccrualPeriodsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: VacationAccrualPeriodRepository;

  public constructor(repository: VacationAccrualPeriodRepository) {
    super();
    this.repository = repository;
  }

  public async execute(filters: Record<string, any>): Promise<any> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset: (page - 1) * limit });
    const withDobra = await Promise.all(rows.map((row) => applyDobraIfNeeded(this.repository, row)));
    return { rows: withDobra, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListVacationAccrualPeriodsUseCase;
