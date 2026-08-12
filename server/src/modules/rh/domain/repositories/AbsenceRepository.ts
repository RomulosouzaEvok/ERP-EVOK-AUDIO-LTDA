/**
 * Interface de repositório de `HrAbsence` (RF-RH-044 a 049, UC-71).
 * @module modules/rh/domain/repositories/AbsenceRepository
 */
abstract class AbsenceRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
  /** Afastamento em aberto (sem `actual_end_date`) do funcionário — RF-RH-044, checagem de conflito. */
  abstract findOpenByEmployeeId(employeeId: number | string): Promise<any | null>;
  /**
   * Soma de dias corridos (`accrual_impact_days`) dos afastamentos dos tipos
   * informados, registrados a partir de `sinceDate` (início do período
   * aquisitivo em curso) — usada pela regra de zeramento de 6 meses
   * (RF-RH-041/049, Art. 133, IV, CLT).
   */
  abstract sumAccumulatedDaysByEmployee(employeeId: number | string, types: readonly string[], sinceDate: string, transaction?: unknown): Promise<number>;
}

export = AbsenceRepository;
