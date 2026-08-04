import UseCase from '../../../../shared/application/UseCase';
import AccessProfilesRepository from '../../domain/repositories/AccessProfilesRepository';
import { AccessProfileListItem } from '../../domain/repositories/AccessProfilePermissionInput';

/**
 * `GET /api/access-profiles` — lista todos os perfis de acesso (ativos e
 * inativos), com a matriz de permissões e a contagem de usuários ativos
 * vinculados a cada um (UC-30/UC-32).
 */
class ListAccessProfilesUseCase extends UseCase<void, AccessProfileListItem[]> {
  private readonly accessProfilesRepository: AccessProfilesRepository;

  public constructor(accessProfilesRepository: AccessProfilesRepository) {
    super();
    this.accessProfilesRepository = accessProfilesRepository;
  }

  /** @returns Lista de perfis de acesso com permissões e `userCount`. */
  public async execute(): Promise<AccessProfileListItem[]> {
    return this.accessProfilesRepository.list();
  }
}

export = ListAccessProfilesUseCase;
