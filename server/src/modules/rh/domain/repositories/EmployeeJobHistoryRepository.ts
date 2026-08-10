/**
 * Interface de repositório de `HrEmployeeJobHistory` (RF-RH-064 a 066 — usado
 * nesta passada P0 apenas para o registro inicial criado na Admissão).
 * @module modules/rh/domain/repositories/EmployeeJobHistoryRepository
 */
abstract class EmployeeJobHistoryRepository {
  abstract create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
}

export = EmployeeJobHistoryRepository;
