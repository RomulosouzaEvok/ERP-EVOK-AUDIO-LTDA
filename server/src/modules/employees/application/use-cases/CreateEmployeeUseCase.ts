/**
 * Use case: criar um novo funcionário.
 *
 * @module modules/employees/application/use-cases/CreateEmployeeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, ConflictError } from '../../../../errors';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';

const Validators: any = require('../../../../utils/validators');

interface CreateEmployeeInput {
  name?: string;
  cpf?: string;
  rg?: string;
  pis_pasep?: string;
  ctps?: string;
  phone?: string;
  email?: string;
  position?: string;
  salary?: number;
  salary_type?: string;
  department_id?: number;
  hire_date?: string;
  shift?: string;
  work_regime?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  notes?: string;
}

class CreateEmployeeUseCase extends UseCase<CreateEmployeeInput, any> {
  private readonly employeesRepository: EmployeesRepository;

  /** @param employeesRepository - Repositorio de funcionários. */
  public constructor(employeesRepository: EmployeesRepository) {
    super();
    this.employeesRepository = employeesRepository;
  }

  /**
   * @param input - Dados do funcionário (name e cpf obrigatórios).
   * @returns Funcionário criado.
   * @throws {ValidationError} Se `name`/`cpf` estiverem ausentes ou o CPF for inválido.
   * @throws {ConflictError} Se o CPF já estiver cadastrado (unicidade).
   */
  public async execute(input: CreateEmployeeInput): Promise<any> {
    const {
      name,
      cpf,
      rg,
      pis_pasep,
      ctps,
      phone,
      email,
      position,
      salary,
      salary_type,
      department_id,
      hire_date,
      shift,
      work_regime,
      bank_name,
      bank_agency,
      bank_account,
      pix_key,
      notes
    } = input;

    if (!name || !cpf) {
      throw new ValidationError('Nome e CPF são obrigatórios');
    }
    if (!Validators.isValidCPF(cpf)) {
      throw new ValidationError('CPF inválido');
    }

    try {
      return await this.employeesRepository.create({
        name,
        cpf: cpf.replace(/[^\d]/g, ''),
        rg,
        pis_pasep,
        ctps,
        phone,
        email,
        position,
        salary,
        salary_type,
        department_id,
        hire_date: hire_date || new Date(),
        shift,
        work_regime,
        bank_name,
        bank_agency,
        bank_account,
        pix_key,
        notes,
        status: 'active'
      });
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF já cadastrado');
      }
      throw error;
    }
  }
}

export = CreateEmployeeUseCase;
