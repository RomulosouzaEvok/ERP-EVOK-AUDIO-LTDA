/**
 * Interface de repositório de `HrEmployeeBenefit` (RF-RH-051 a 054).
 * @module modules/rh/domain/repositories/EmployeeBenefitRepository
 */
abstract class EmployeeBenefitRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
  /** Adesão `ativo` do mesmo funcionário + tipo de benefício — RF-RH-051, bloqueio de duplicidade. */
  abstract findActiveByEmployeeAndType(employeeId: number | string, benefitTypeId: number | string): Promise<any | null>;
  /** Adesões `ativo` do funcionário — usada pela suspensão de VT/VR em afastamentos (RF-RH-047). */
  abstract listActiveByEmployee(employeeId: number | string, transaction?: unknown): Promise<any[]>;
  /**
   * Adesões vigentes numa competência (`enrolled_at <= monthEnd` e
   * (`canceled_at` nulo ou `>= monthStart`)) — RF-RH-053, relatório mensal.
   */
  abstract listActiveForCompetence(monthStart: string, monthEnd: string): Promise<any[]>;
}

export = EmployeeBenefitRepository;
