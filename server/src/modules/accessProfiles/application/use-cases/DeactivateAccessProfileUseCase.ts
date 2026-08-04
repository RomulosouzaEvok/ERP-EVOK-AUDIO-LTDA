import type { Request } from 'express';
import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import AccessProfilesRepository from '../../domain/repositories/AccessProfilesRepository';

const { logAction } = require('../../../../services/auditLogService');

interface DeactivateAccessProfileInput {
  id: number;
  req: Request;
}

interface DeactivateAccessProfileOutput {
  id: number;
  nome: string;
  active: false;
}

/**
 * `DELETE /api/access-profiles/:id` — desativa (soft delete, `active =
 * false`) um perfil de acesso (UC-32).
 *
 * Regra **DECIDIDA** (`docs/business/01-USE_CASES.md` UC-32,
 * `BUSINESS_RULES.md` §1.2): bloqueia a desativação com 422
 * `BusinessRuleError` enquanto houver qualquer usuário ativo vinculado ao
 * perfil, listando os usuários afetados em `details` (Padrão de Alerta
 * Didático, `BUSINESS_RULES.md` §13 — "O QUE FAZER": realocar os usuários
 * para outro perfil via `PUT /api/users/:id/access-profile` antes de
 * tentar novamente).
 */
class DeactivateAccessProfileUseCase extends UseCase<DeactivateAccessProfileInput, DeactivateAccessProfileOutput> {
  private readonly accessProfilesRepository: AccessProfilesRepository;

  public constructor(accessProfilesRepository: AccessProfilesRepository) {
    super();
    this.accessProfilesRepository = accessProfilesRepository;
  }

  /**
   * @param input - `{ id, req }`.
   * @returns `{ id, nome, active: false }`.
   * @throws {NotFoundError} Se o perfil não existir.
   * @throws {BusinessRuleError} Se houver usuário(s) ativo(s) vinculados — `details.users` lista os afetados.
   */
  public async execute({ id, req }: DeactivateAccessProfileInput): Promise<DeactivateAccessProfileOutput> {
    const profile = await this.accessProfilesRepository.findById(id);
    if (!profile) {
      throw new NotFoundError('Perfil de acesso não encontrado.');
    }

    const { count, users } = await this.accessProfilesRepository.countActiveUsers(id);
    if (count > 0) {
      throw new BusinessRuleError(
        `Não é possível desativar o perfil "${profile.nome}": há ${count} usuário(s) ativo(s) vinculado(s) a ele. Reatribua cada usuário a outro perfil (PUT /api/users/:id/access-profile) antes de desativar.`,
        { profileId: id, profileName: profile.nome, userCount: count, users },
      );
    }

    await this.accessProfilesRepository.deactivate(id);

    logAction(req, {
      action: 'deactivate',
      entityType: 'AccessProfile',
      entityId: id,
      entityDescription: profile.nome,
      oldValues: { active: true },
      newValues: { active: false },
      description: `Perfil de acesso "${profile.nome}" desativado`,
    });

    return { id, nome: profile.nome, active: false };
  }
}

export = DeactivateAccessProfileUseCase;
