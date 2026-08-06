/**
 * Use case: buscar funcionário por id.
 *
 * @module modules/employees/application/use-cases/GetEmployeeByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';
import {
  hasFullEmployeeAccess,
  sanitizeEmployee,
  RequestingUserContext,
} from '../../domain/services/employeeSensitiveFields';

interface GetEmployeeByIdInput {
  id: number | string;
  /**
   * Usuário autenticado que fez a requisição (`req.user`), usado apenas
   * para decidir se os campos sensíveis de RH (BR-RH-020) entram na
   * resposta.
   */
  requestingUser?: RequestingUserContext;
}

class GetEmployeeByIdUseCase extends UseCase<GetEmployeeByIdInput, any> {
  private readonly employeesRepository: EmployeesRepository;

  /** @param employeesRepository - Repositorio de funcionários. */
  public constructor(employeesRepository: EmployeesRepository) {
    super();
    this.employeesRepository = employeesRepository;
  }

  /**
   * @param input - Id do funcionário e usuário requisitante.
   * @returns Funcionário encontrado (sem campos sensíveis quando o
   *   requisitante não tem acesso de RH, BR-RH-020).
   * @throws {NotFoundError} Se o funcionário não existir.
   */
  public async execute({ id, requestingUser }: GetEmployeeByIdInput): Promise<any> {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Funcionário não encontrado');
    }
    return sanitizeEmployee(employee, hasFullEmployeeAccess(requestingUser));
  }
}

export = GetEmployeeByIdUseCase;
