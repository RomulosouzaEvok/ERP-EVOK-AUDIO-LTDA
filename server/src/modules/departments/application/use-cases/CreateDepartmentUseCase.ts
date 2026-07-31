/**
 * Use case: criar um novo departamento.
 *
 * @module modules/departments/application/use-cases/CreateDepartmentUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, ConflictError } from '../../../../errors';
import DepartmentsRepository from '../../domain/repositories/DepartmentsRepository';

interface CreateDepartmentInput {
  code?: string;
  name?: string;
  sigla?: string;
  description?: string;
}

class CreateDepartmentUseCase extends UseCase<CreateDepartmentInput, any> {
  private readonly departmentsRepository: DepartmentsRepository;

  /** @param departmentsRepository - Repositorio de departamentos. */
  public constructor(departmentsRepository: DepartmentsRepository) {
    super();
    this.departmentsRepository = departmentsRepository;
  }

  /**
   * @param input - Dados do departamento (code e name obrigatórios).
   * @returns Departamento criado.
   * @throws {ValidationError} Se `code` ou `name` estiverem ausentes.
   * @throws {ConflictError} Se `code`/`name` já existirem (unicidade).
   */
  public async execute(input: CreateDepartmentInput): Promise<any> {
    const { code, name, sigla, description } = input;
    if (!code || !name) {
      throw new ValidationError('Código e nome são obrigatórios');
    }
    try {
      return await this.departmentsRepository.create({ code, name, sigla, description, active: true });
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Código ou nome já existe');
      }
      throw error;
    }
  }
}

export = CreateDepartmentUseCase;
