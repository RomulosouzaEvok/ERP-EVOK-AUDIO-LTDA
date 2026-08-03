/**
 * Caso de uso: substituicao completa dos turnos de um centro de trabalho.
 *
 * Valida que `end_time > start_time` e que nao ha sobreposicao de turnos no
 * mesmo dia da semana (`weekday`) antes de persistir. A substituicao e
 * transacional (delete + insert), garantida por uma transacao Sequelize
 * fornecida pelo controller.
 *
 * @module modules/workCenters/application/use-cases/ReplaceWorkCenterShiftsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import WorkCenterRepository from '../../domain/repositories/WorkCenterRepository';

type ShiftInput = {
  weekday: number;
  start_time: string;
  end_time: string;
};

type ReplaceWorkCenterShiftsInput = {
  work_center_id: number;
  shifts: ShiftInput[];
  transaction: any;
};

/** Converte 'HH:MM' em minutos desde a meia-noite, para comparacao numerica. */
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

class ReplaceWorkCenterShiftsUseCase extends UseCase<ReplaceWorkCenterShiftsInput, any> {
  private readonly workCenterRepository: WorkCenterRepository;

  constructor(workCenterRepository: WorkCenterRepository) {
    super();
    this.workCenterRepository = workCenterRepository;
  }

  async execute(input: ReplaceWorkCenterShiftsInput): Promise<any> {
    const workCenter = await this.workCenterRepository.findWorkCenterById(input.work_center_id);
    if (!workCenter) {
      throw new NotFoundError('Centro de trabalho nao encontrado.');
    }

    this.validateShifts(input.shifts);

    await this.workCenterRepository.deleteShiftsByWorkCenter(input.work_center_id, input.transaction);

    for (const shift of input.shifts) {
      await this.workCenterRepository.createShift({
        work_center_id: input.work_center_id,
        weekday: shift.weekday,
        start_time: shift.start_time,
        end_time: shift.end_time,
      }, input.transaction);
    }

    return this.workCenterRepository.findWorkCenterById(input.work_center_id);
  }

  /**
   * Valida que cada turno tem `end_time > start_time` e que nao ha
   * sobreposicao entre turnos do mesmo `weekday`.
   *
   * @throws BusinessRuleError (422) se alguma regra for violada.
   */
  private validateShifts(shifts: ShiftInput[]): void {
    const byWeekday = new Map<number, Array<{ start: number; end: number }>>();

    for (const shift of shifts) {
      const start = toMinutes(shift.start_time);
      const end = toMinutes(shift.end_time);

      if (end <= start) {
        throw new BusinessRuleError(
          `Turno invalido no dia ${shift.weekday}: horario final deve ser maior que o inicial.`,
          { weekday: shift.weekday, start_time: shift.start_time, end_time: shift.end_time }
        );
      }

      const existing = byWeekday.get(shift.weekday) ?? [];
      for (const range of existing) {
        const overlaps = start < range.end && end > range.start;
        if (overlaps) {
          throw new BusinessRuleError(
            `Turnos sobrepostos no dia ${shift.weekday}.`,
            { weekday: shift.weekday }
          );
        }
      }
      existing.push({ start, end });
      byWeekday.set(shift.weekday, existing);
    }
  }
}

export = ReplaceWorkCenterShiftsUseCase;
