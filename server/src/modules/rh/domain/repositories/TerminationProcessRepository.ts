/**
 * Interface de repositório de `HrTerminationProcess` (RF-RH-017 a 023).
 * @module modules/rh/domain/repositories/TerminationProcessRepository
 */
abstract class TerminationProcessRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract findOpenByEmployeeId(employeeId: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
}

export = TerminationProcessRepository;
