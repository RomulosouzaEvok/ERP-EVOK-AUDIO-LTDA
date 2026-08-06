import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');
import type { OeeAggregateRow, OeeWorkCenterRow, OeeWorkCenterShift, OeeDowntimeRow } from '../../domain/reportTypes';
import type { ReportPeriodInput, ResolvedReportPeriod } from './reportPeriod';

const { resolveReportPeriod } = require('./reportPeriod');
const { ValidationError } = require('../../../../errors');

/** Filtro de `GET /api/reports/oee` (período + centro de trabalho opcional). */
interface GetOeeReportInput extends ReportPeriodInput {
  work_center_id?: string | number;
}

/** Horas de parada por motivo, para auditoria/exibição no relatório (nunca omite motivos sem parada — só lista os que ocorreram). */
interface OeeDowntimeReasonBreakdown {
  reason: string;
  hours: number;
}

/**
 * Os 3 eixos do OEE (disponibilidade, performance, qualidade) e suas bases
 * de cálculo, para um centro de trabalho ou para o agregado geral.
 *
 * `availability`/`performance`/`quality`/`oee` são `null` (nunca `0`
 * artificial) quando o denominador correspondente é zero — `no_data_reason`
 * explica o motivo. Quando não-nulos, cada eixo é limitado a 100%
 * (`Math.min(rate, 1)`): ver `GetOeeReportUseCase.divideOrNull`.
 */
interface OeeComponents {
  available_hours: number;
  downtime_hours: number;
  downtime_by_reason: OeeDowntimeReasonBreakdown[];
  run_hours: number;
  standard_hours: number;
  quantity_good: number;
  quantity_scrapped: number;
  tracking_count: number;
  availability: number | null;
  performance: number | null;
  quality: number | null;
  oee: number | null;
  no_data_reason: string | null;
}

/** OEE de um centro de trabalho específico. */
interface OeeWorkCenterResult extends OeeComponents {
  work_center_id: number;
  code: string;
  name: string;
  has_shifts: boolean;
}

/** Saída de `GetOeeReportUseCase`. */
interface GetOeeReportOutput {
  report_type: 'oee';
  generated_at: Date;
  period: ResolvedReportPeriod['period'];
  work_center_id: number | null;
  by_work_center: OeeWorkCenterResult[];
  aggregate: OeeComponents & { work_centers_count: number };
}

/**
 * Relatório de OEE — Overall Equipment Effectiveness (`GET /api/reports/oee`),
 * item 7/9 do `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` ("OEE completo ainda não
 * implementado"). Calcula os 3 eixos clássicos por centro de trabalho
 * (`work_centers`) e um agregado geral, no período informado:
 *
 * - **Disponibilidade** = horas produzindo / horas disponíveis líquidas.
 *   Horas produzindo vêm de `production_order_tracking`
 *   (`finished_at - started_at` dos apontamentos `completed` no período).
 *   Horas disponíveis BRUTAS vêm do calendário de turnos do centro
 *   (`work_center_shifts`) multiplicado pelas ocorrências de cada dia da
 *   semana no período × `machines_count` × `efficiency_factor`; se o centro
 *   não tem turnos cadastrados, usa o fallback `capacity_hours_per_day *
 *   dias_do_periodo * machines_count * efficiency_factor` (mesmo fallback
 *   documentado em `GetWorkCenterLoadUseCase`).
 *
 *   DESCONTO DE PARADAS (`production_downtimes`, ver
 *   `docs/governance/TODO.md` — "campo de downtime/paradas para OEE
 *   preciso"): as horas disponíveis LÍQUIDAS (`available_hours` no payload)
 *   descontam as horas de parada registradas do centro no período —
 *   `available_hours = max(horas_brutas_calendario - downtime_hours, 0)`,
 *   nunca negativo (se as paradas superarem o calendário — ex.: parada
 *   aberta de longa duração cruzando vários períodos — a disponibilidade
 *   líquida satura em zero, não fica negativa). `downtime_hours` (soma) e
 *   `downtime_by_reason` (breakdown por categoria — setup, manutenção
 *   corretiva/preventiva, falta de material/operador, qualidade, outros)
 *   são expostos no payload para auditoria, no mesmo espírito das bases já
 *   expostas (`run_hours`, `standard_hours`, etc.). Uma parada em aberto
 *   (`finished_at IS NULL`) conta até o fim do período informado, ou até
 *   `NOW()` se o período já terminou — nunca além do fim do período (ver
 *   `SequelizeReportsRepository.findDowntimeHoursByWorkCenter`).
 *
 * - **Performance** = (tempo padrão × unidades processadas) / tempo real
 *   apontado, ambos agregados por centro. Tempo padrão usa apenas
 *   `standard_time_minutes` da etapa de roteiro (sem `setup_time_minutes`,
 *   ver `SequelizeReportsRepository.findOeeAggregatesByWorkCenter`).
 *   "Unidades processadas" = boas + refugadas (o refugo consumiu tempo de
 *   processamento; a perda de qualidade é medida separadamente no eixo de
 *   qualidade).
 *
 * - **Qualidade** = unidades boas / (boas + refugadas), agregado por centro
 *   no período.
 *
 * - **OEE = Disponibilidade × Performance × Qualidade**, só calculado
 *   quando os 3 eixos são não-nulos.
 *
 * Todos os eixos individuais são limitados a 100% (`Math.min(rate, 1)`):
 * valores acima de 100% indicariam horas extras não cadastradas no
 * calendário de turnos (disponibilidade) ou tempo padrão desatualizado/
 * otimista (performance), nunca eficiência real acima do ideal — as horas
 * brutas (`available_hours`/`run_hours`/`standard_hours`) permanecem no
 * payload sem cap, para auditoria.
 */
class GetOeeReportUseCase extends UseCase<GetOeeReportInput, GetOeeReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param input - `{ start_date?, end_date?, work_center_id? }` (YYYY-MM-DD;
   *   default últimos 30 dias).
   * @returns OEE por centro de trabalho e agregado geral.
   * @throws {ValidationError} Se `work_center_id` for informado e não for um
   *   inteiro positivo.
   */
  async execute(input: GetOeeReportInput = {}): Promise<GetOeeReportOutput> {
    const { start, end, period } = resolveReportPeriod(input);
    const workCenterId = this.parseWorkCenterId(input.work_center_id);

    const [workCenters, aggregateRows, downtimeRows]: [OeeWorkCenterRow[], OeeAggregateRow[], OeeDowntimeRow[]] = await Promise.all([
      this.reportsRepository.findWorkCentersForOee(workCenterId),
      this.reportsRepository.findOeeAggregatesByWorkCenter(start, end, workCenterId),
      this.reportsRepository.findDowntimeHoursByWorkCenter(start, end, workCenterId),
    ]);

    const aggregateByCenter = new Map<number, OeeAggregateRow>();
    for (const row of aggregateRows || []) {
      aggregateByCenter.set(Number(row.work_center_id), row);
    }

    const downtimeByCenter = new Map<number, OeeDowntimeRow[]>();
    for (const row of downtimeRows || []) {
      const centerId = Number(row.work_center_id);
      const rows = downtimeByCenter.get(centerId) ?? [];
      rows.push(row);
      downtimeByCenter.set(centerId, rows);
    }

    const weekdayCounts = this.countWeekdaysInPeriod(start, end);
    const daysInPeriod = Array.from(weekdayCounts.values()).reduce((sum, n) => sum + n, 0) || 1;

    const byWorkCenter: OeeWorkCenterResult[] = (workCenters || []).map((workCenter: any) => {
      const plain = typeof workCenter.get === 'function' ? workCenter.get({ plain: true }) : workCenter;
      return this.buildWorkCenterResult(
        plain,
        aggregateByCenter.get(Number(plain.id)),
        downtimeByCenter.get(Number(plain.id)) ?? [],
        weekdayCounts,
        daysInPeriod,
      );
    });

    return {
      report_type: 'oee',
      generated_at: new Date(),
      period,
      work_center_id: workCenterId ?? null,
      by_work_center: byWorkCenter,
      aggregate: this.buildAggregate(byWorkCenter),
    };
  }

  /**
   * @param raw - Valor bruto de `work_center_id` (query string ou número).
   * @returns Inteiro positivo, ou `undefined` se não informado.
   * @throws {ValidationError} Se informado e não for um inteiro positivo.
   */
  private parseWorkCenterId(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ValidationError('work_center_id inválido: informe um inteiro positivo.');
    }
    return parsed;
  }

  /** Monta o resultado de OEE de um centro de trabalho (3 eixos + composto). */
  private buildWorkCenterResult(
    plain: any,
    agg: OeeAggregateRow | undefined,
    downtimeRows: OeeDowntimeRow[],
    weekdayCounts: Map<number, number>,
    daysInPeriod: number,
  ): OeeWorkCenterResult {
    const shifts: OeeWorkCenterShift[] = plain.shifts ?? [];
    const machinesCount = Number(plain.machines_count) || 1;
    const efficiencyFactor = Number(plain.efficiency_factor) || 0;
    const hasShifts = shifts.length > 0;

    const calendarHours = hasShifts
      ? this.calculateCapacityFromShifts(shifts, weekdayCounts) * machinesCount * efficiencyFactor
      : Number(plain.capacity_hours_per_day || 0) * daysInPeriod * machinesCount * efficiencyFactor;

    const downtimeByReason = this.buildDowntimeByReason(downtimeRows);
    const downtimeHours = downtimeByReason.reduce((sum, row) => sum + row.hours, 0);
    // Disponibilidade líquida = calendário - paradas registradas, nunca negativa.
    const availableHours = Math.max(calendarHours - downtimeHours, 0);

    const runHours = Number(agg?.run_hours ?? 0);
    const standardHours = Number(agg?.standard_hours ?? 0);
    const quantityGood = Number(agg?.quantity_good ?? 0);
    const quantityScrapped = Number(agg?.quantity_scrapped ?? 0);
    const trackingCount = Number(agg?.tracking_count ?? 0);

    const availability = this.divideOrNull(runHours, availableHours);
    const performance = this.divideOrNull(standardHours, runHours);
    const quality = this.divideOrNull(quantityGood, quantityGood + quantityScrapped);

    return {
      work_center_id: Number(plain.id),
      code: plain.code,
      name: plain.name,
      has_shifts: hasShifts,
      available_hours: this.round(availableHours),
      downtime_hours: this.round(downtimeHours),
      downtime_by_reason: downtimeByReason,
      run_hours: this.round(runHours),
      standard_hours: this.round(standardHours),
      quantity_good: quantityGood,
      quantity_scrapped: quantityScrapped,
      tracking_count: trackingCount,
      availability,
      performance,
      quality,
      oee: this.composeOee(availability, performance, quality),
      no_data_reason: this.buildNoDataReason(availability, performance, quality),
    };
  }

  /** Converte as linhas brutas de downtime do centro num breakdown arredondado por motivo (só motivos com parada > 0 aparecem). */
  private buildDowntimeByReason(rows: OeeDowntimeRow[]): OeeDowntimeReasonBreakdown[] {
    return (rows || [])
      .map((row) => ({ reason: row.reason, hours: this.round(Number(row.hours) || 0) }))
      .filter((row) => row.hours > 0);
  }

  /**
   * Agregado geral: soma as horas/quantidades brutas de todos os centros
   * retornados (respeitando o filtro `work_center_id`, se houver) e recalcula
   * os 3 eixos sobre os totais — NÃO é a média das taxas por centro (uma
   * média simples de taxas distorceria o resultado quando os centros têm
   * volumes de produção muito diferentes). `downtime_by_reason` do agregado
   * soma o breakdown de todos os centros por motivo (não é uma lista por
   * centro).
   */
  private buildAggregate(byWorkCenter: OeeWorkCenterResult[]): OeeComponents & { work_centers_count: number } {
    const totals = byWorkCenter.reduce(
      (acc, row) => {
        acc.available_hours += row.available_hours;
        acc.downtime_hours += row.downtime_hours;
        acc.run_hours += row.run_hours;
        acc.standard_hours += row.standard_hours;
        acc.quantity_good += row.quantity_good;
        acc.quantity_scrapped += row.quantity_scrapped;
        acc.tracking_count += row.tracking_count;
        return acc;
      },
      { available_hours: 0, downtime_hours: 0, run_hours: 0, standard_hours: 0, quantity_good: 0, quantity_scrapped: 0, tracking_count: 0 },
    );

    const downtimeByReasonTotals = new Map<string, number>();
    for (const center of byWorkCenter) {
      for (const row of center.downtime_by_reason) {
        downtimeByReasonTotals.set(row.reason, (downtimeByReasonTotals.get(row.reason) ?? 0) + row.hours);
      }
    }
    const downtimeByReason = Array.from(downtimeByReasonTotals.entries()).map(([reason, hours]) => ({
      reason,
      hours: this.round(hours),
    }));

    const availability = this.divideOrNull(totals.run_hours, totals.available_hours);
    const performance = this.divideOrNull(totals.standard_hours, totals.run_hours);
    const quality = this.divideOrNull(totals.quantity_good, totals.quantity_good + totals.quantity_scrapped);

    const noDataReason = byWorkCenter.length === 0
      ? 'nenhum centro de trabalho ativo encontrado (ou o work_center_id informado não corresponde a um centro ativo)'
      : this.buildNoDataReason(availability, performance, quality);

    return {
      available_hours: this.round(totals.available_hours),
      downtime_hours: this.round(totals.downtime_hours),
      downtime_by_reason: downtimeByReason,
      run_hours: this.round(totals.run_hours),
      standard_hours: this.round(totals.standard_hours),
      quantity_good: totals.quantity_good,
      quantity_scrapped: totals.quantity_scrapped,
      tracking_count: totals.tracking_count,
      availability,
      performance,
      quality,
      oee: this.composeOee(availability, performance, quality),
      no_data_reason: noDataReason,
      work_centers_count: byWorkCenter.length,
    };
  }

  /** OEE = D × P × Q, só calculado quando os 3 eixos são não-nulos. */
  private composeOee(availability: number | null, performance: number | null, quality: number | null): number | null {
    if (availability === null || performance === null || quality === null) return null;
    return this.round(availability * performance * quality, 4);
  }

  /** Explica por que algum eixo ficou `null`, para exibição no relatório. */
  private buildNoDataReason(availability: number | null, performance: number | null, quality: number | null): string | null {
    const reasons: string[] = [];
    if (availability === null) reasons.push('sem horas disponíveis no período (centro sem turnos e sem capacidade/dia configurada)');
    if (performance === null) reasons.push('sem apontamento concluído no período');
    if (quality === null) reasons.push('sem quantidade (boa ou refugo) apontada no período');
    return reasons.length > 0 ? reasons.join('; ') : null;
  }

  /**
   * Divisão protegida contra zero: retorna `null` (nunca `0` enganoso)
   * quando o denominador é zero. Quando o denominador é positivo, a taxa é
   * limitada a 100% (`Math.min(rate, 1)`) — ver limitação documentada no
   * cabeçalho da classe.
   */
  private divideOrNull(numerator: number, denominator: number): number | null {
    if (!denominator || denominator <= 0) return null;
    return this.round(Math.min(numerator / denominator, 1), 4);
  }

  /**
   * Conta quantas vezes cada `weekday` (0=domingo...6=sábado) ocorre no
   * período `[start, end]` (inclusive, por data, ignorando hora).
   */
  private countWeekdaysInPeriod(start: Date, end: Date): Map<number, number> {
    const counts = new Map<number, number>();
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // Guarda contra período invertido/absurdamente longo (>10 anos) — resolveReportPeriod
    // já rejeita start > end, este guard é só uma defesa adicional de robustez.
    let guard = 0;
    while (cursor.getTime() <= endDate.getTime() && guard < 3660) {
      const weekday = cursor.getDay();
      counts.set(weekday, (counts.get(weekday) ?? 0) + 1);
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    return counts;
  }

  /** Soma as horas de todos os turnos do centro, ponderadas pela ocorrência do weekday no período. */
  private calculateCapacityFromShifts(shifts: OeeWorkCenterShift[], weekdayCounts: Map<number, number>): number {
    let total = 0;
    for (const shift of shifts) {
      const occurrences = weekdayCounts.get(Number(shift.weekday)) ?? 0;
      if (occurrences === 0) continue;
      total += this.timeRangeToHours(shift.start_time, shift.end_time) * occurrences;
    }
    return total;
  }

  /** Converte um intervalo `'HH:MM:SS'`/`'HH:MM'` em horas decimais. */
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

export = GetOeeReportUseCase;
