/**
 * Interface de repositório de `HrEmployeeTraining` (RF-RH-057/058).
 * @module modules/rh/domain/repositories/EmployeeTrainingRepository
 */
abstract class EmployeeTrainingRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>): Promise<any>;
  /** Registro de conclusão mais recente do par funcionário × curso (`completed_at` mais recente) — RF-RH-058. */
  abstract findLatestByEmployeeAndCourse(employeeId: number | string, trainingCourseId: number | string): Promise<any | null>;
}

export = EmployeeTrainingRepository;
