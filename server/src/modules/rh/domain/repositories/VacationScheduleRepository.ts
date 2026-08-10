/**
 * Interface de repositório de `HrVacationSchedule` (RF-RH-035 a 040).
 * @module modules/rh/domain/repositories/VacationScheduleRepository
 */
abstract class VacationScheduleRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
  /** Frações ativas (não substituídas/canceladas) do mesmo período aquisitivo — para validar limites agregados. */
  abstract listActiveByAccrualPeriod(accrualPeriodId: number | string): Promise<any[]>;
  /**
   * Frações cujo intervalo `[start_date, start_date+days)` sobrepõe o intervalo informado — RF-RH-039.
   * @param departmentId - Departamento a filtrar, ou `null` para todos (usado pelo calendário geral, `GET /vacation-schedules/calendar`).
   */
  abstract listOverlappingByDepartment(departmentId: number | string | null, startDate: string, endDate: string): Promise<any[]>;
}

export = VacationScheduleRepository;
