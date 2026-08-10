/**
 * `GET /api/rh/vacation-accrual-periods/:id` — detalhe + verificação ativa de dobra (RF-RH-034).
 * @module modules/rh/application/use-cases/vacation/GetVacationAccrualPeriodByIdUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import { applyDobraIfNeeded } from '../../../domain/services/vacationAccrualAutoExpire';

class GetVacationAccrualPeriodByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: VacationAccrualPeriodRepository;

  public constructor(repository: VacationAccrualPeriodRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id }: { id: number | string }): Promise<any> {
    const period = await this.repository.findById(id);
    if (!period) throw new NotFoundError('Período aquisitivo não encontrado.');
    return applyDobraIfNeeded(this.repository, period);
  }
}

export = GetVacationAccrualPeriodByIdUseCase;
