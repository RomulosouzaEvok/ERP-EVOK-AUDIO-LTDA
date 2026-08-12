/**
 * `POST /api/rh/benefit-types` — RF-RH-050.
 * @module modules/rh/application/use-cases/benefit/CreateBenefitTypeUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import BenefitTypeRepository from '../../../domain/repositories/BenefitTypeRepository';

interface CreateBenefitTypeInput {
  name: string;
  category: string;
  funding_rule: string;
  supplier?: string | null;
  active?: boolean;
}

class CreateBenefitTypeUseCase extends UseCase<CreateBenefitTypeInput, any> {
  private readonly benefitTypeRepository: BenefitTypeRepository;

  public constructor(benefitTypeRepository: BenefitTypeRepository) {
    super();
    this.benefitTypeRepository = benefitTypeRepository;
  }

  /** @throws {ValidationError} `name`/`category`/`funding_rule` ausentes (400). */
  public async execute(input: CreateBenefitTypeInput): Promise<any> {
    if (!input.name || !input.category || !input.funding_rule) {
      throw new ValidationError('name, category e funding_rule são obrigatórios.');
    }
    return this.benefitTypeRepository.create({
      name: input.name,
      category: input.category,
      funding_rule: input.funding_rule,
      supplier: input.supplier ?? null,
      active: input.active ?? true,
    });
  }
}

export = CreateBenefitTypeUseCase;
