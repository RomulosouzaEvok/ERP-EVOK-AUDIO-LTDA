/**
 * Use case: criar um novo usuario.
 *
 * @module modules/auth/application/use-cases/RegisterUserUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { RegisterUserEntity } from '../../domain/entities/AuthCredentialsEntity';
import { ConflictError } from '../../../../errors';
import AuthRepository from '../../domain/repositories/AuthRepository';

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  role?: string;
}

interface RegisterUserOutput {
  id: number;
  name: string;
  email: string;
  role: string;
}

class RegisterUserUseCase extends UseCase<RegisterUserInput, RegisterUserOutput> {
  private readonly authRepository: AuthRepository;

  /** @param authRepository - Repositorio de autenticacao. */
  public constructor(authRepository: AuthRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param input - Dados do novo usuario.
   * @returns Usuario criado (sem `password`).
   * @throws {ConflictError} Com mensagem `'Email já cadastrado'` se o email ja existir.
   */
  public async execute({ name, email, password, role }: RegisterUserInput): Promise<RegisterUserOutput> {
    const entity = new RegisterUserEntity({ name, email, password, role });

    let user: any;
    try {
      user = await this.authRepository.createUser({
        name: entity.name,
        email: entity.email,
        password: entity.password,
        role: entity.role || 'operator'
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Email já cadastrado');
      }
      throw error;
    }

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}

export = RegisterUserUseCase;
