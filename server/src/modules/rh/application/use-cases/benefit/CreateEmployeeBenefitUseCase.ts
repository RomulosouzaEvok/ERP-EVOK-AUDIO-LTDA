/**
 * `POST /api/rh/employee-benefits` — RF-RH-051/052, §10.1 do contrato de
 * API. `employee.salary` é sempre lido internamente do repositório (nunca
 * aceito no payload — evita spoofing do limite de 6% de VT).
 *
 * @module modules/rh/application/use-cases/benefit/CreateEmployeeBenefitUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, ConflictError, BusinessRuleError } from '../../../../../errors';
import EmployeeBenefitRepository from '../../../domain/repositories/EmployeeBenefitRepository';
import BenefitTypeRepository from '../../../domain/repositories/BenefitTypeRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { validateVtDiscountLimit, validateDependentsAllowed } from '../../../domain/services/benefitRules';

interface CreateEmployeeBenefitInput {
  employee_id: number;
  benefit_type_id: number;
  discount_value?: number | null;
  company_cost_value?: number | null;
  dependents?: unknown;
  createdBy: number;
}

class CreateEmployeeBenefitUseCase extends UseCase<CreateEmployeeBenefitInput, any> {
  private readonly employeeBenefitRepository: EmployeeBenefitRepository;
  private readonly benefitTypeRepository: BenefitTypeRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;

  public constructor(
    employeeBenefitRepository: EmployeeBenefitRepository,
    benefitTypeRepository: BenefitTypeRepository,
    employeeDirectoryService: EmployeeDirectoryService,
  ) {
    super();
    this.employeeBenefitRepository = employeeBenefitRepository;
    this.benefitTypeRepository = benefitTypeRepository;
    this.employeeDirectoryService = employeeDirectoryService;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes; `dependents` fora de saúde/odonto (400).
   * @throws {NotFoundError} `employee_id`/`benefit_type_id` não existe (404).
   * @throws {ConflictError} Já existe adesão ativa para o mesmo par (409).
   * @throws {BusinessRuleError} `VT_DISCOUNT_LIMIT_EXCEEDED` (422).
   */
  public async execute(input: CreateEmployeeBenefitInput): Promise<any> {
    if (!input.employee_id || !input.benefit_type_id) {
      throw new ValidationError('employee_id e benefit_type_id são obrigatórios.');
    }

    const employee = await this.employeeDirectoryService.findById(input.employee_id);
    if (!employee) throw new NotFoundError('Funcionário não encontrado.');

    const benefitType = await this.benefitTypeRepository.findById(input.benefit_type_id);
    if (!benefitType) throw new NotFoundError('Tipo de benefício não encontrado.');

    try {
      validateDependentsAllowed(benefitType.category, input.dependents);
    } catch (error: any) {
      throw new ValidationError(error.message, { code: 'DEPENDENTS_NOT_ALLOWED' });
    }

    const existing = await this.employeeBenefitRepository.findActiveByEmployeeAndType(input.employee_id, input.benefit_type_id);
    if (existing) {
      throw new ConflictError('Já existe uma adesão ativa deste funcionário para este tipo de benefício.');
    }

    if (benefitType.category === 'vt' && input.discount_value) {
      try {
        validateVtDiscountLimit(Number(input.discount_value), Number(employee.salary));
      } catch (error: any) {
        throw new BusinessRuleError(error.message, { code: 'VT_DISCOUNT_LIMIT_EXCEEDED' });
      }
    }

    return this.employeeBenefitRepository.create({
      employee_id: input.employee_id,
      benefit_type_id: input.benefit_type_id,
      enrollment_status: 'ativo',
      discount_value: input.discount_value ?? null,
      company_cost_value: input.company_cost_value ?? null,
      dependents: input.dependents ?? null,
      suspended_days: 0,
      created_by: input.createdBy,
    });
  }
}

export = CreateEmployeeBenefitUseCase;
