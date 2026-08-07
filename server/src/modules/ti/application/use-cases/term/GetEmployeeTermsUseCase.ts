/**
 * `GET /api/ti/responsibility-terms/by-employee/:employeeId` — ficha
 * "equipamentos por funcionário" (RF-TI-022).
 *
 * @module modules/ti/application/use-cases/term/GetEmployeeTermsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';
import { toTermDTO } from '../../../infrastructure/mappers/TermMapper';

class GetEmployeeTermsUseCase extends UseCase<{ employeeId: number }, any[]> {
  private readonly repository: ResponsibilityTermRepository;

  public constructor(repository: ResponsibilityTermRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ employeeId }: { employeeId: number }): Promise<any[]> {
    const terms = await this.repository.listByEmployee(employeeId);
    return terms.map(toTermDTO);
  }
}

export = GetEmployeeTermsUseCase;
