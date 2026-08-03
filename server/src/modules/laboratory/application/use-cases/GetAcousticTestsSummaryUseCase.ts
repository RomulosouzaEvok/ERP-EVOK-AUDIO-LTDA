/**
 * Caso de uso: resumo agregado (por `test_type`) de testes de laboratorio
 * nos ultimos N dias.
 *
 * @module modules/laboratory/application/use-cases/GetAcousticTestsSummaryUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import LaboratoryRepository from '../../domain/repositories/LaboratoryRepository';

type GetAcousticTestsSummaryInput = {
  product_id?: number;
  days?: number;
};

class GetAcousticTestsSummaryUseCase extends UseCase<GetAcousticTestsSummaryInput, any[]> {
  private readonly laboratoryRepository: LaboratoryRepository;

  constructor(laboratoryRepository: LaboratoryRepository) {
    super();
    this.laboratoryRepository = laboratoryRepository;
  }

  async execute({ product_id, days = 30 }: GetAcousticTestsSummaryInput = {}) {
    return this.laboratoryRepository.getSummary({ product_id, days });
  }
}

export = GetAcousticTestsSummaryUseCase;
