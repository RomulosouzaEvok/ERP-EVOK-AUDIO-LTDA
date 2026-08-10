/**
 * Interface de repositório de `HrVacationAccrualPeriod` (RF-RH-031 a 034, 041 a 043).
 * @module modules/rh/domain/repositories/VacationAccrualPeriodRepository
 */
abstract class VacationAccrualPeriodRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
  /** Período `em_curso`/`programado` mais recente do funcionário (para abertura automática/zeramento). */
  abstract findOpenByEmployeeId(employeeId: number | string): Promise<any | null>;
  /** Todos os períodos não finais (`em_curso`/`programado`) — para verificação ativa de dobra (RF-RH-034). */
  abstract findAllOpen(): Promise<any[]>;
}

export = VacationAccrualPeriodRepository;
