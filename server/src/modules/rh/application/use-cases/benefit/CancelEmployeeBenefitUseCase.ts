/**
 * `POST /api/rh/employee-benefits/:id/cancel` — RF-RH-054 (opt-out).
 * **Nunca** `DELETE` físico — o banco tem trigger
 * (`trg_hr_block_delete_employee_benefit`) que bloqueia a exclusão;
 * cancelamento é sempre `enrollment_status='cancelado'` + `canceled_at`.
 *
 * @module modules/rh/application/use-cases/benefit/CancelEmployeeBenefitUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import EmployeeBenefitRepository from '../../../domain/repositories/EmployeeBenefitRepository';

interface CancelEmployeeBenefitInput {
  id: number | string;
}

class CancelEmployeeBenefitUseCase extends UseCase<CancelEmployeeBenefitInput, any> {
  private readonly employeeBenefitRepository: EmployeeBenefitRepository;

  public constructor(employeeBenefitRepository: EmployeeBenefitRepository) {
    super();
    this.employeeBenefitRepository = employeeBenefitRepository;
  }

  /**
   * @throws {NotFoundError} Adesão não existe (404).
   * @throws {BusinessRuleError} Adesão já cancelada (422).
   */
  public async execute(input: CancelEmployeeBenefitInput): Promise<any> {
    const benefit = await this.employeeBenefitRepository.findById(input.id);
    if (!benefit) throw new NotFoundError('Adesão de benefício não encontrada.');
    if (benefit.enrollment_status === 'cancelado') {
      throw new BusinessRuleError('Adesão já está cancelada.');
    }
    return this.employeeBenefitRepository.update(input.id, { enrollment_status: 'cancelado', canceled_at: new Date() });
  }
}

export = CancelEmployeeBenefitUseCase;
