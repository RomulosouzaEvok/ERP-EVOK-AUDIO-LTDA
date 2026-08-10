/**
 * `POST /api/rh/vacation-schedules/:id/confirm-taken` — §8.1 do contrato de
 * API, UC-67 passo 6 ("Funcionário goza as férias; RH confirma o gozo,
 * atualizando `dias_gozados` do período").
 *
 * Regra legal envolvida: **Art. 137, caput, CLT** — a dobra só deixa de
 * incidir quando as férias são efetivamente CONCEDIDAS dentro do período
 * concessivo. Por isso o período aquisitivo só sai de `em_curso`/
 * `programado` para `gozado` quando `days_taken` alcança `entitled_days`;
 * gozo parcial mantém o período aberto (e, portanto, ainda sujeito à
 * verificação ativa de dobra em `applyDobraIfNeeded`).
 *
 * Literais de status conferidos contra as migrations `20260808-000019`
 * (`hr_vacation_schedules.status`: `planejado|confirmado|em_gozo|concluido|
 * cancelado`) e `20260808-000018` (`hr_vacation_accrual_periods.status`:
 * `em_curso|programado|gozado|vencido_dobra|zerado`).
 *
 * @module modules/rh/application/use-cases/vacation/ConfirmVacationTakenUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import VacationScheduleRepository from '../../../domain/repositories/VacationScheduleRepository';

/** Status de `hr_vacation_schedules` que ainda admitem confirmação de gozo. */
const CONFIRMABLE_SCHEDULE_STATUSES = ['planejado', 'confirmado', 'em_gozo'];

class ConfirmVacationTakenUseCase extends UseCase<{ id: number | string; days_taken?: number }, any> {
  private readonly scheduleRepository: VacationScheduleRepository;
  private readonly accrualRepository: VacationAccrualPeriodRepository;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  public constructor(
    scheduleRepository: VacationScheduleRepository,
    accrualRepository: VacationAccrualPeriodRepository,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.scheduleRepository = scheduleRepository;
    this.accrualRepository = accrualRepository;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @param input.id - Id da fração de férias (`hr_vacation_schedules.id`).
   * @param input.days_taken - Dias efetivamente gozados (default: os dias planejados da fração).
   * @throws {NotFoundError} Fração ou período aquisitivo inexistente (404).
   * @throws {BusinessRuleError} Fração já concluída/cancelada, ou gozo acima dos dias de direito do período (422).
   */
  public async execute({ id, days_taken }: { id: number | string; days_taken?: number }): Promise<any> {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError('Programação de férias não encontrada.');
    if (!CONFIRMABLE_SCHEDULE_STATUSES.includes(schedule.status)) {
      throw new BusinessRuleError('Programação de férias já está concluída ou cancelada.', { rule: 'RF-RH-035' });
    }

    const period = await this.accrualRepository.findById(schedule.accrual_period_id);
    if (!period) throw new NotFoundError('Período aquisitivo não encontrado.');

    const effectiveDays = days_taken ?? schedule.days;
    if (effectiveDays <= 0) {
      throw new BusinessRuleError('days_taken deve ser maior que zero.', { rule: 'RF-RH-035' });
    }

    const totalTaken = Number(period.days_taken ?? 0) + Number(effectiveDays);
    if (totalTaken > Number(period.entitled_days)) {
      throw new BusinessRuleError(
        `Gozo confirmado (${totalTaken} dias) excede os dias de direito do período aquisitivo (${period.entitled_days} — Art. 130, CLT).`,
        { code: 'EXCEEDS_ACCRUAL_DAYS', rule: 'RF-RH-032' },
      );
    }

    // Art. 137 caput CLT — período só é considerado gozado (fora do risco
    // de dobra) quando TODOS os dias de direito foram usufruídos.
    const periodFullyTaken = totalTaken >= Number(period.entitled_days);

    return this.runInTransaction(async (transaction) => {
      const updatedSchedule = await this.scheduleRepository.update(id, { status: 'concluido' }, transaction);
      const updatedPeriod = await this.accrualRepository.update(period.id, {
        days_taken: totalTaken,
        ...(periodFullyTaken ? { status: 'gozado' } : {}),
      }, transaction);
      return { schedule: updatedSchedule, accrual_period: updatedPeriod };
    });
  }
}

export = ConfirmVacationTakenUseCase;
