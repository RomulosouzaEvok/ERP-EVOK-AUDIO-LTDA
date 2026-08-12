/**
 * `GET /api/rh/attendance/monthly-summary?competencia=YYYY-MM&employee_id=` —
 * resumo mensal por funcionário a partir dos lotes de ponto CONFIRMADOS
 * (`hr_time_import_items` de lotes `status='confirmed'`), cruzado com
 * afastamentos (`hr_absences`) que se sobrepõem ao mês — RF pedido pela
 * tarefa ("dias de afastamento no período aparecem no resumo").
 *
 * ⚠️ Limitação conhecida (documentada em `docs/rh/04-FREQUENCIA.md`): não
 * há UNIQUE(employee_id, work_date) — se dois lotes confirmados cobrirem a
 * mesma competência (reimportação), o resumo soma os dois. Mesma decisão
 * já tomada para `hr_payroll_import_batches` (cada lote é um evento
 * auditável, não um upsert).
 *
 * @module modules/rh/application/use-cases/timeImport/GetMonthlyAttendanceSummaryUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import TimeImportRepository from '../../../domain/repositories/TimeImportRepository';
import { competenceMonthRange, absenceDaysOverlappingPeriod } from '../../../domain/services/attendanceSummaryRules';

interface GetMonthlyAttendanceSummaryInput {
  competencia: string;
  employee_id?: number | string;
}

interface EmployeeAttendanceSummary {
  employee_id: number;
  employee_name: string;
  hours_worked: number;
  overtime_50: number;
  overtime_100: number;
  night_hours: number;
  absences_from_import: number;
  absences_justified: number;
  absence_days_from_hr_absences: number;
}

class GetMonthlyAttendanceSummaryUseCase extends UseCase<GetMonthlyAttendanceSummaryInput, EmployeeAttendanceSummary[]> {
  private readonly repository: TimeImportRepository;

  public constructor(repository: TimeImportRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `competencia` ausente ou fora do formato `YYYY-MM` (400). */
  public async execute(input: GetMonthlyAttendanceSummaryInput): Promise<EmployeeAttendanceSummary[]> {
    if (!input.competencia || !/^\d{4}-\d{2}$/.test(input.competencia)) {
      throw new ValidationError('competencia é obrigatória, no formato YYYY-MM.');
    }

    const { start, end } = competenceMonthRange(input.competencia);

    const [items, absences] = await Promise.all([
      this.repository.listConfirmedItemsByPeriod(start, end, input.employee_id),
      this.repository.listAbsencesOverlappingPeriod(start, end, input.employee_id),
    ]);

    const summaryByEmployee = new Map<number, EmployeeAttendanceSummary>();

    const ensureEntry = (employeeId: number, employeeName: string): EmployeeAttendanceSummary => {
      let entry = summaryByEmployee.get(employeeId);
      if (!entry) {
        entry = {
          employee_id: employeeId,
          employee_name: employeeName,
          hours_worked: 0,
          overtime_50: 0,
          overtime_100: 0,
          night_hours: 0,
          absences_from_import: 0,
          absences_justified: 0,
          absence_days_from_hr_absences: 0,
        };
        summaryByEmployee.set(employeeId, entry);
      }
      return entry;
    };

    for (const item of items) {
      const employeeId = item.employee_id;
      if (!employeeId) continue; // Item não-casado não entra no resumo por funcionário.
      const employeeName = item.employee?.name ?? `Funcionário #${employeeId}`;
      const entry = ensureEntry(employeeId, employeeName);
      entry.hours_worked += Number(item.hours_worked ?? 0);
      entry.overtime_50 += Number(item.overtime_50 ?? 0);
      entry.overtime_100 += Number(item.overtime_100 ?? 0);
      entry.night_hours += Number(item.night_hours ?? 0);
      if (item.absence) entry.absences_from_import += 1;
      if (item.absence_justified) entry.absences_justified += 1;
    }

    for (const absence of absences) {
      const employeeId = absence.employee_id;
      const employeeName = absence.employee?.name ?? `Funcionário #${employeeId}`;
      const entry = ensureEntry(employeeId, employeeName);
      entry.absence_days_from_hr_absences += absenceDaysOverlappingPeriod(
        absence.start_date,
        absence.actual_end_date,
        absence.expected_end_date,
        start,
        end,
      );
    }

    return Array.from(summaryByEmployee.values())
      .map((entry) => ({
        ...entry,
        hours_worked: Math.round(entry.hours_worked * 100) / 100,
        overtime_50: Math.round(entry.overtime_50 * 100) / 100,
        overtime_100: Math.round(entry.overtime_100 * 100) / 100,
        night_hours: Math.round(entry.night_hours * 100) / 100,
      }))
      .sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  }
}

export = GetMonthlyAttendanceSummaryUseCase;
