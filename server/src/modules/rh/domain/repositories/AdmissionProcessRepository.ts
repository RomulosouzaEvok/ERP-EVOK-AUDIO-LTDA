/**
 * Interface de repositório de `HrAdmissionProcess` (RF-RH-007 a 012).
 * @module modules/rh/domain/repositories/AdmissionProcessRepository
 */
abstract class AdmissionProcessRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any | null>;
}

export = AdmissionProcessRepository;
