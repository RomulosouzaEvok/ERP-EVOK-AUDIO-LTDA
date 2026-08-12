/**
 * Interface de repositório de `HrBenefitType` (RF-RH-050).
 * @module modules/rh/domain/repositories/BenefitTypeRepository
 */
abstract class BenefitTypeRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>): Promise<any | null>;
}

export = BenefitTypeRepository;
