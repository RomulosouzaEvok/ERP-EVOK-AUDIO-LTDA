/**
 * Interface de repositório de `HrEmployeeContract` (RF-RH-013 a 016).
 * @module modules/rh/domain/repositories/EmployeeContractRepository
 */
abstract class EmployeeContractRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract findOpenByEmployeeId(employeeId: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
  /** Lista contratos `experiencia` em `ativo` cujo período (1 ou 2) já venceu — para verificação ativa (RF-RH-016). */
  abstract findExpiredActiveExperienceContracts(today: string): Promise<any[]>;
}

export = EmployeeContractRepository;
