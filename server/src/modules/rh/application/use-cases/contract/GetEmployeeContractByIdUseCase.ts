/**
 * `GET /api/rh/employee-contracts/:id` — RF-RH-016, verificação ativa de
 * vencimento sem decisão (UC-68 E1, RNF-RH-02) via
 * `applyAutoExpireIfNeeded` (`domain/services/experienceContractAutoExpire`).
 *
 * @module modules/rh/application/use-cases/contract/GetEmployeeContractByIdUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import EmployeeContractRepository from '../../../domain/repositories/EmployeeContractRepository';
import { applyAutoExpireIfNeeded } from '../../../domain/services/experienceContractAutoExpire';

class GetEmployeeContractByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: EmployeeContractRepository;

  public constructor(repository: EmployeeContractRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id }: { id: number | string }): Promise<any> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundError('Contrato de experiência não encontrado.');
    return applyAutoExpireIfNeeded(this.repository, contract);
  }
}

export = GetEmployeeContractByIdUseCase;
