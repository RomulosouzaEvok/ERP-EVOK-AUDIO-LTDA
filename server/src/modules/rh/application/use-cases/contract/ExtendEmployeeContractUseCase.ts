/**
 * `PATCH /api/rh/employee-contracts/:id/extend` — RF-RH-015 (única
 * prorrogação, Art. 451 CLT), §5.1 do contrato de API.
 *
 * @module modules/rh/application/use-cases/contract/ExtendEmployeeContractUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import EmployeeContractRepository from '../../../domain/repositories/EmployeeContractRepository';
import { validateMaxDuration, validateSingleExtension } from '../../../domain/services/experienceContractRules';

class ExtendEmployeeContractUseCase extends UseCase<{ id: number | string; period_2_end_date: string }, any> {
  private readonly repository: EmployeeContractRepository;

  public constructor(repository: EmployeeContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Contrato não existe (404).
   * @throws {BusinessRuleError} Já prorrogado uma vez (Art. 451 CLT); excede 90 dias (Art. 445 § único CLT); contrato não é `experiencia`/`ativo` (422).
   */
  public async execute({ id, period_2_end_date }: { id: number | string; period_2_end_date: string }): Promise<any> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundError('Contrato de experiência não encontrado.');

    if (contract.type !== 'experiencia' || contract.status !== 'ativo') {
      throw new BusinessRuleError('Apenas contratos type=experiencia em status=ativo podem ser prorrogados.', { rule: 'RF-RH-015' });
    }

    try {
      validateSingleExtension(contract.period_2_end_date);
      validateMaxDuration(contract.start_date, period_2_end_date);
    } catch (error: any) {
      throw new BusinessRuleError(error.message, { rule: 'RF-RH-014/015' });
    }

    return this.repository.update(id, { period_2_end_date, status: 'prorrogado', effective_end_date: period_2_end_date });
  }
}

export = ExtendEmployeeContractUseCase;
