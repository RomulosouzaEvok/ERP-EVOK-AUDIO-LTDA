/**
 * `PUT /api/rh/benefit-types/:id` — sem `DELETE` (catálogo referenciado).
 * @module modules/rh/application/use-cases/benefit/UpdateBenefitTypeUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import BenefitTypeRepository from '../../../domain/repositories/BenefitTypeRepository';

interface UpdateBenefitTypeInput {
  id: number | string;
  name?: string;
  category?: string;
  funding_rule?: string;
  supplier?: string | null;
  active?: boolean;
}

class UpdateBenefitTypeUseCase extends UseCase<UpdateBenefitTypeInput, any> {
  private readonly benefitTypeRepository: BenefitTypeRepository;

  public constructor(benefitTypeRepository: BenefitTypeRepository) {
    super();
    this.benefitTypeRepository = benefitTypeRepository;
  }

  /** @throws {NotFoundError} Tipo de benefício não existe (404). */
  public async execute(input: UpdateBenefitTypeInput): Promise<any> {
    const { id, ...data } = input;
    const updated = await this.benefitTypeRepository.update(id, data);
    if (!updated) throw new NotFoundError('Tipo de benefício não encontrado.');
    return updated;
  }
}

export = UpdateBenefitTypeUseCase;
