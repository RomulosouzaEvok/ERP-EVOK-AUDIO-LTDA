/**
 * Interface de repositório de `HrTrainingCourse` (RF-RH-055).
 * @module modules/rh/domain/repositories/TrainingCourseRepository
 */
abstract class TrainingCourseRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>): Promise<any | null>;
  /** Cursos exigidos (`required=true`) pela matriz `HrJobPositionTraining` de um cargo — RF-RH-026/058. */
  abstract listRequiredByJobPosition(jobPositionId: number | string): Promise<any[]>;
}

export = TrainingCourseRepository;
