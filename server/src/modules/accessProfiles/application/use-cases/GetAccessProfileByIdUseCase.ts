import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import AccessProfilesRepository from '../../domain/repositories/AccessProfilesRepository';
import { AccessProfileListItem } from '../../domain/repositories/AccessProfilePermissionInput';

interface Input {
  id: number;
}

/**
 * `GET /api/access-profiles/:id` — busca um perfil de acesso por id, com a
 * matriz de permissões e a contagem de usuários ativos vinculados.
 */
class GetAccessProfileByIdUseCase extends UseCase<Input, AccessProfileListItem> {
  private readonly accessProfilesRepository: AccessProfilesRepository;

  public constructor(accessProfilesRepository: AccessProfilesRepository) {
    super();
    this.accessProfilesRepository = accessProfilesRepository;
  }

  /**
   * @param input - `{ id }`.
   * @returns Perfil de acesso encontrado.
   * @throws {NotFoundError} Se o id não existir.
   */
  public async execute({ id }: Input): Promise<AccessProfileListItem> {
    const profile = await this.accessProfilesRepository.findById(id);
    if (!profile) {
      throw new NotFoundError('Perfil de acesso não encontrado.');
    }
    return profile;
  }
}

export = GetAccessProfileByIdUseCase;
