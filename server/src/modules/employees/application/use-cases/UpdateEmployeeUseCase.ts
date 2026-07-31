/**
 * Use case: atualizar um funcionário existente.
 *
 * @module modules/employees/application/use-cases/UpdateEmployeeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, NotFoundError, ConflictError } from '../../../../errors';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';

const Validators: any = require('../../../../utils/validators');

const ALLOWED_FIELDS = [
  'name',
  'rg',
  'pis_pasep',
  'ctps',
  'phone',
  'email',
  'position',
  'salary',
  'salary_type',
  'department_id',
  'shift',
  'work_regime',
  'bank_name',
  'bank_agency',
  'bank_account',
  'pix_key',
  'notes',
  'status'
];

interface UpdateEmployeeInput {
  id: number | string;
  body: Record<string, unknown>;
}

class UpdateEmployeeUseCase extends UseCase<UpdateEmployeeInput, any> {
  private readonly employeesRepository: EmployeesRepository;

  /** @param employeesRepository - Repositorio de funcionários. */
  public constructor(employeesRepository: EmployeesRepository) {
    super();
    this.employeesRepository = employeesRepository;
  }

  /**
   * @param input - Id do funcionário e campos a atualizar (apenas os permitidos).
   * @returns Funcionário atualizado.
   * @throws {ValidationError} Se o CPF informado for inválido.
   * @throws {NotFoundError} Se o funcionário não existir.
   * @throws {ConflictError} Se o CPF já estiver cadastrado (unicidade).
   */
  public async execute({ id, body }: UpdateEmployeeInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.cpf !== undefined) {
      if (!Validators.isValidCPF(body.cpf as string)) {
        throw new ValidationError('CPF inválido');
      }
      updateData.cpf = (body.cpf as string).replace(/[^\d]/g, '');
    }

    try {
      const updated = await this.employeesRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundError('Funcionário não encontrado');
      }
      return this.employeesRepository.findById(id);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF já cadastrado');
      }
      throw error;
    }
  }
}

export = UpdateEmployeeUseCase;
