/**
 * `POST /api/rh/vacation-accrual-periods/:id/recalculate` — RF-RH-032, Art.
 * 130 CLT (idempotente).
 *
 * ⚠️ Escopo desta passada P0: `HrTimeSheetSummary` (RF-RH-060, Grupo 10)
 * é P1 e não foi implementado — portanto este use case sempre assume `0`
 * faltas injustificadas (`data_gap_detected: true` sempre, até a passada 2
 * trazer a importação real de ponto). O contrato de API já previa esse
 * comportamento como fallback explícito ("se não houver TimeSheetSummary
 * para algum mês do período, assume 0 faltas... retorna
 * data_gap_detected:true"); aqui ele é o caminho único, não o de exceção.
 *
 * @module modules/rh/application/use-cases/vacation/RecalculateVacationAccrualPeriodUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import { calculateEntitledDays } from '../../../domain/services/vacationRules';

class RecalculateVacationAccrualPeriodUseCase extends UseCase<{ id: number | string; unexcusedAbsencesOverride?: number }, any> {
  private readonly repository: VacationAccrualPeriodRepository;

  public constructor(repository: VacationAccrualPeriodRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Período não existe (404). */
  public async execute({ id, unexcusedAbsencesOverride }: { id: number | string; unexcusedAbsencesOverride?: number }): Promise<any> {
    const period = await this.repository.findById(id);
    if (!period) throw new NotFoundError('Período aquisitivo não encontrado.');

    // TODO(passada 2): somar HrTimeSheetSummary.faltas_injustificadas do
    // intervalo [period_start, period_end) quando o Grupo 10 (P1) existir.
    const unexcusedAbsences = unexcusedAbsencesOverride ?? 0;
    const entitledDays = calculateEntitledDays(unexcusedAbsences);

    const updated = await this.repository.update(id, { unexcused_absences: unexcusedAbsences, entitled_days: entitledDays });
    return { ...(updated?.toJSON ? updated.toJSON() : updated), data_gap_detected: unexcusedAbsencesOverride === undefined };
  }
}

export = RecalculateVacationAccrualPeriodUseCase;
