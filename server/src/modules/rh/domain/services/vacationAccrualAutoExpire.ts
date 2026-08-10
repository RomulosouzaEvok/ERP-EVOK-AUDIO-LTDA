/**
 * Verificação ativa de dobra do período concessivo (RF-RH-034, UC-67 E2,
 * RNF-RH-02, Art. 137 caput CLT) — compartilhada por
 * `GetVacationAccrualPeriodByIdUseCase`/`ListVacationAccrualPeriodsUseCase`/
 * dashboard. Grava `status='vencido_dobra'` na própria leitura (idempotente).
 *
 * @module modules/rh/domain/services/vacationAccrualAutoExpire
 */
import VacationAccrualPeriodRepository from '../repositories/VacationAccrualPeriodRepository';
import { isConcessiveExpired } from './vacationRules';

export async function applyDobraIfNeeded(repository: VacationAccrualPeriodRepository, period: any, today: Date = new Date()): Promise<any> {
  if (!isConcessiveExpired(period.concessive_end, period.status, today)) return period;
  const updated = await repository.update(period.id, { status: 'vencido_dobra' });
  return updated ?? period;
}

export default applyDobraIfNeeded;
