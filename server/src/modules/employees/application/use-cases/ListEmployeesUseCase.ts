/**
 * Use case: listar funcionários com busca/filtros e paginacao.
 *
 * @module modules/employees/application/use-cases/ListEmployeesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';
import {
  hasFullEmployeeAccess,
  sanitizeEmployeeList,
  RequestingUserContext,
} from '../../domain/services/employeeSensitiveFields';

interface ListEmployeesInput {
  page?: string | number;
  limit?: string | number;
  search?: string;
  status?: string;
  department_id?: string | number;
  user_id?: string | number;
  /**
   * Usuário autenticado que fez a requisição (`req.user`), usado apenas
   * para decidir se os campos sensíveis de RH (BR-RH-020) entram na
   * resposta — nunca para filtrar quais funcionários aparecem na lista.
   */
  requestingUser?: RequestingUserContext;
}

interface ListEmployeesOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListEmployeesUseCase extends UseCase<ListEmployeesInput, ListEmployeesOutput> {
  private readonly employeesRepository: EmployeesRepository;

  /** @param employeesRepository - Repositorio de funcionários. */
  public constructor(employeesRepository: EmployeesRepository) {
    super();
    this.employeesRepository = employeesRepository;
  }

  /**
   * @param input - Filtros de busca, paginacao e usuário requisitante (para
   *   segregação de campos sensíveis, BR-RH-020).
   * @returns Linhas encontradas (sem campos sensíveis quando o requisitante
   *   não tem acesso de RH), total e dados de paginacao.
   */
  public async execute(input: ListEmployeesInput): Promise<ListEmployeesOutput> {
    const { page = '1', limit = '10', search, status, department_id, user_id, requestingUser } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.employeesRepository.findAndCountAll(
      { search, status, department_id, user_id },
      { limit: l, offset: o }
    );

    const canViewSensitive = hasFullEmployeeAccess(requestingUser);
    return {
      rows: sanitizeEmployeeList(rows, canViewSensitive),
      total: count,
      page: p,
      limit: l,
      totalPages: Math.ceil(count / l),
    };
  }
}

export = ListEmployeesUseCase;
