/**
 * Use case: listar funcionários com busca/filtros e paginacao.
 *
 * @module modules/employees/application/use-cases/ListEmployeesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';

interface ListEmployeesInput {
  page?: string | number;
  limit?: string | number;
  search?: string;
  status?: string;
  department_id?: string | number;
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
   * @param input - Filtros de busca e paginacao.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListEmployeesInput): Promise<ListEmployeesOutput> {
    const { page = '1', limit = '10', search, status, department_id } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.employeesRepository.findAndCountAll(
      { search, status, department_id },
      { limit: l, offset: o }
    );

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListEmployeesUseCase;
