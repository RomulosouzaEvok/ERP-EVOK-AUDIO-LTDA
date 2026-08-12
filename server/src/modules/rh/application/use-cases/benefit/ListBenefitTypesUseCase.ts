/**
 * `GET /api/rh/benefit-types` — RF-RH-050.
 * @module modules/rh/application/use-cases/benefit/ListBenefitTypesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import BenefitTypeRepository from '../../../domain/repositories/BenefitTypeRepository';

interface ListBenefitTypesInput {
  category?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

class ListBenefitTypesUseCase extends UseCase<ListBenefitTypesInput, any> {
  private readonly benefitTypeRepository: BenefitTypeRepository;

  public constructor(benefitTypeRepository: BenefitTypeRepository) {
    super();
    this.benefitTypeRepository = benefitTypeRepository;
  }

  public async execute(input: ListBenefitTypesInput): Promise<any> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { count, rows } = await this.benefitTypeRepository.findAndCount(
      { category: input.category, active: input.active },
      { limit, offset: (page - 1) * limit },
    );
    return { count, rows, page, limit, totalPages: Math.ceil(count / limit) || 1 };
  }
}

export = ListBenefitTypesUseCase;
