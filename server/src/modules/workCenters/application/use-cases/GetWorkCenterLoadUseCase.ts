/**
 * Caso de uso: relatorio de carga-maquina (capacidade x carga) por centro de
 * trabalho ativo, para um horizonte de `days` dias a partir de hoje.
 *
 * Regras de calculo:
 * - `capacity_hours`: se o centro tem turnos cadastrados, soma as horas dos
 *   turnos nos proximos `days` dias (considerando o `weekday` de cada dia do
 *   horizonte), multiplicada por `machines_count` e `efficiency_factor`.
 *   Se o centro NAO tem turnos cadastrados, usa
 *   `capacity_hours_per_day * days * machines_count * efficiency_factor`
 *   (fallback simplificado: conta todos os dias do horizonte, inclusive
 *   fins de semana, pois sem turnos cadastrados nao ha como saber quais
 *   dias sao produtivos — documentado tambem no `README.md` do modulo).
 * - `load_hours`: soma, para as OPs em status `planned/released/in_progress/
 *   paused`, de `GREATEST(quantity - quantity_produced, 0) *
 *   (standard_time_minutes + setup_time_minutes) / 60` das etapas de
 *   roteiro (`production_route_steps`) vinculadas ao centro de trabalho via
 *   `work_center_id`, cujo roteiro (`production_routes`) pertence ao produto
 *   da OP (`product_id`).
 * - `utilization_rate = load_hours / capacity_hours`, protegido contra
 *   divisao por zero (retorna `null` quando `capacity_hours === 0`).
 *
 * @module modules/workCenters/application/use-cases/GetWorkCenterLoadUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import WorkCenterRepository from '../../domain/repositories/WorkCenterRepository';

type GetWorkCenterLoadInput = {
  days?: number;
};

type WorkCenterLoadRow = {
  id: number;
  code: string;
  name: string;
  machines_count: number;
  capacity_hours: number;
  load_hours: number;
  utilization_rate: number | null;
  steps_count: number;
};

type GetWorkCenterLoadOutput = {
  horizon_days: number;
  centers: WorkCenterLoadRow[];
};

class GetWorkCenterLoadUseCase extends UseCase<GetWorkCenterLoadInput, GetWorkCenterLoadOutput> {
  private readonly workCenterRepository: WorkCenterRepository;

  constructor(workCenterRepository: WorkCenterRepository) {
    super();
    this.workCenterRepository = workCenterRepository;
  }

  async execute({ days = 7 }: GetWorkCenterLoadInput = {}): Promise<GetWorkCenterLoadOutput> {
    const horizonDays = days;

    const [workCenters, loadRows] = await Promise.all([
      this.workCenterRepository.listActiveWorkCentersWithShifts(),
      this.workCenterRepository.aggregateLoadByWorkCenter(),
    ]);

    const loadByWorkCenterId = new Map<number, { load_hours: number; steps_count: number }>();
    for (const row of loadRows) {
      loadByWorkCenterId.set(Number(row.work_center_id), {
        load_hours: Number(row.load_hours) || 0,
        steps_count: Number(row.steps_count) || 0,
      });
    }

    const weekdayCounts = this.countWeekdaysInHorizon(horizonDays);

    const centers: WorkCenterLoadRow[] = workCenters.map((workCenter: any) => {
      const plain = typeof workCenter.get === 'function' ? workCenter.get({ plain: true }) : workCenter;
      const shifts: any[] = plain.shifts ?? [];
      const machinesCount = Number(plain.machines_count) || 1;
      const efficiencyFactor = Number(plain.efficiency_factor) || 1;

      const capacityHours = shifts.length > 0
        ? this.calculateCapacityFromShifts(shifts, weekdayCounts) * machinesCount * efficiencyFactor
        : Number(plain.capacity_hours_per_day) * horizonDays * machinesCount * efficiencyFactor;

      const load = loadByWorkCenterId.get(Number(plain.id)) ?? { load_hours: 0, steps_count: 0 };

      return {
        id: plain.id,
        code: plain.code,
        name: plain.name,
        machines_count: machinesCount,
        capacity_hours: this.round(capacityHours),
        load_hours: this.round(load.load_hours),
        utilization_rate: capacityHours > 0 ? this.round(load.load_hours / capacityHours, 4) : null,
        steps_count: load.steps_count,
      };
    });

    centers.sort((a, b) => {
      const rateA = a.utilization_rate ?? -1;
      const rateB = b.utilization_rate ?? -1;
      return rateB - rateA;
    });

    return { horizon_days: horizonDays, centers };
  }

  /**
   * Conta quantas vezes cada `weekday` (0=domingo...6=sabado) ocorre nos
   * proximos `days` dias, comecando em hoje (inclusive).
   */
  private countWeekdaysInHorizon(days: number): Map<number, number> {
    const counts = new Map<number, number>();
    const today = new Date();

    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const weekday = date.getDay();
      counts.set(weekday, (counts.get(weekday) ?? 0) + 1);
    }

    return counts;
  }

  /** Soma as horas de todos os turnos, ponderadas pela ocorrencia do weekday no horizonte. */
  private calculateCapacityFromShifts(shifts: any[], weekdayCounts: Map<number, number>): number {
    let total = 0;
    for (const shift of shifts) {
      const occurrences = weekdayCounts.get(Number(shift.weekday)) ?? 0;
      if (occurrences === 0) continue;
      const hours = this.timeRangeToHours(shift.start_time, shift.end_time);
      total += hours * occurrences;
    }
    return total;
  }

  /** Converte um intervalo 'HH:MM:SS'/'HH:MM' em horas decimais. */
  private timeRangeToHours(startTime: string, endTime: string): number {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };
    const diffMinutes = toMinutes(endTime) - toMinutes(startTime);
    return Math.max(diffMinutes, 0) / 60;
  }

  private round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}

export = GetWorkCenterLoadUseCase;
