import type { Request } from 'express';
const { UseCase } = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const { logAction } = require('../../../../services/auditLogService');
const { AccessProfile } = require('../../../../models/index');

export interface AssignAccessProfileInput {
  id: number;
  accessProfileId: number | null;
  req: Request;
}

export interface AssignAccessProfileOutput {
  id: number;
  accessProfileId: number | null;
}

/**
 * `PUT /api/users/:id/access-profile` — atribui (ou remove) o perfil de
 * acesso de área de um usuário (UC-33).
 *
 * Regras (`docs/business/01-USE_CASES.md` UC-33, `BUSINESS_RULES.md` §2/§3):
 * - Um usuário tem, no máximo, um perfil ativo por vez — atribuir um novo
 *   perfil **substitui** o anterior (não há acumulação).
 * - `access_profile_id = null` remove a atribuição (usuário volta ao
 *   estado "sem perfil", UC-35-Exceção).
 * - O perfil informado deve existir e estar `active = true` (422 se
 *   existir mas estiver inativo, 404 se não existir).
 * - Atribuir um perfil a um usuário `role = admin` é permitido mas
 *   irrelevante em runtime (o admin nunca é bloqueado por perfil de área,
 *   §3) — nenhuma validação extra é necessária aqui, apenas persistência.
 * - **UC-36 (decidido):** a troca NÃO invalida sessão/token ativo do
 *   usuário-alvo — nenhuma versão de sessão é incrementada aqui.
 * - Toda atribuição é auditada com o valor anterior e o novo valor (§5).
 */
class AssignAccessProfileUseCase extends UseCase {
  /** @param usersRepository - Repositório de usuários. */
  constructor(usersRepository: any) {
    super();
    this.usersRepository = usersRepository;
  }

  usersRepository: any;

  /**
   * @param input - `{ id, accessProfileId, req }`.
   * @returns `{ id, accessProfileId }`.
   * @throws {NotFoundError} Se o usuário ou o perfil informado não existirem.
   * @throws {BusinessRuleError} Se o perfil informado existir mas estiver `active = false`.
   */
  async execute({ id, accessProfileId, req }: AssignAccessProfileInput): Promise<AssignAccessProfileOutput> {
    const before = await this.usersRepository.findById(id);
    if (!before) {
      throw new NotFoundError('Usuário não encontrado.');
    }

    if (accessProfileId !== null && accessProfileId !== undefined) {
      const profile = await AccessProfile.findByPk(accessProfileId);
      if (!profile) {
        throw new NotFoundError('Perfil de acesso não encontrado.');
      }
      if (!profile.active) {
        throw new BusinessRuleError(
          `O perfil "${profile.nome}" está inativo e não pode ser atribuído a um usuário. Escolha outro perfil ativo ou reative-o antes.`,
        );
      }
    }

    const newValue = accessProfileId ?? null;
    await this.usersRepository.update(id, { accessProfileId: newValue });

    logAction(req, {
      action: 'assign',
      entityType: 'UserAccessAssignment',
      entityId: id,
      entityDescription: before.email,
      oldValues: { accessProfileId: before.accessProfileId ?? null },
      newValues: { accessProfileId: newValue },
      description: `Perfil de acesso do usuário ${before.email} alterado (efetivo no próximo login, UC-36)`,
    });

    return { id, accessProfileId: newValue };
  }
}

export = AssignAccessProfileUseCase;
