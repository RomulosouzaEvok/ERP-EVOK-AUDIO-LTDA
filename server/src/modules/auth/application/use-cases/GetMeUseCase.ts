/**
 * Use case: retornar os dados do usuario autenticado.
 *
 * @module modules/auth/application/use-cases/GetMeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import AuthRepository from '../../domain/repositories/AuthRepository';

interface GetMeInput {
  userId: number;
}

class GetMeUseCase extends UseCase<GetMeInput, any | null> {
  private readonly authRepository: AuthRepository;

  /** @param authRepository - Repositorio de autenticacao. */
  public constructor(authRepository: AuthRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param input - Id do usuario autenticado.
   * @returns Usuario (sem `password`), ou `null` se nao encontrado.
   */
  public async execute({ userId }: GetMeInput): Promise<any | null> {
    return this.authRepository.findUserById(userId);
  }
}

export = GetMeUseCase;
