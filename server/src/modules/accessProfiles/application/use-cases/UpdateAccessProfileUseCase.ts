import type { Request } from 'express';
import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError, ValidationError } from '../../../../errors';
import AccessProfilesRepository from '../../domain/repositories/AccessProfilesRepository';
import { AccessProfileListItem, AccessProfilePermissionInput } from '../../domain/repositories/AccessProfilePermissionInput';
import { validatePermissions } from './validatePermissions';

const { logAction } = require('../../../../services/auditLogService');

interface UpdateAccessProfileInput {
  id: number;
  nome?: string;
  descricao?: string | null;
  allowedWarehouses?: string[] | null;
  permissions: AccessProfilePermissionInput[];
  req: Request;
}

/**
 * `PUT /api/access-profiles/:id` — edita um perfil de acesso existente,
 * substituindo integralmente sua matriz de permissões (UC-31), em uma
 * única transação Sequelize.
 *
 * Regras (`docs/business/01-USE_CASES.md` UC-31, `BUSINESS_RULES.md` §5):
 * - Mesma validação de forma/unicidade de `permissions` do UC-30.
 * - `nome`, se alterado, deve continuar único (409).
 * - O log de auditoria registra o **valor anterior completo da matriz de
 *   permissões** (`oldValues`) junto do novo valor (`newValues`) —
 *   obrigatório por `BUSINESS_RULES.md` §5.
 * - Efeito imediato: a próxima requisição de qualquer usuário atribuído a
 *   este perfil já reflete a nova matriz (o middleware `authorizeModule`
 *   consulta o perfil no banco a cada request, sem cache — UC-31 nota 5).
 */
class UpdateAccessProfileUseCase extends UseCase<UpdateAccessProfileInput, AccessProfileListItem> {
  private readonly accessProfilesRepository: AccessProfilesRepository;

  public constructor(accessProfilesRepository: AccessProfilesRepository) {
    super();
    this.accessProfilesRepository = accessProfilesRepository;
  }

  /**
   * @param input - Dados a atualizar e a requisição original (para `logAction`).
   * @returns Perfil de acesso atualizado.
   * @throws {NotFoundError} Se o perfil não existir.
   * @throws {ValidationError} Se `permissions` for inválido/vazio, ou `nome` vazio quando informado.
   * @throws {ConflictError} Se o novo `nome` colidir com outro perfil.
   */
  public async execute({ id, nome, descricao, allowedWarehouses, permissions, req }: UpdateAccessProfileInput): Promise<AccessProfileListItem> {
    const before = await this.accessProfilesRepository.findById(id);
    if (!before) {
      throw new NotFoundError('Perfil de acesso não encontrado.');
    }

    let trimmedNome: string | undefined;
    if (nome !== undefined) {
      trimmedNome = nome.trim();
      if (!trimmedNome) {
        throw new ValidationError('Nome do perfil é obrigatório.');
      }
      const duplicate = await this.accessProfilesRepository.findByNome(trimmedNome, id);
      if (duplicate) {
        throw new ConflictError('Já existe um perfil com este nome.');
      }
    }

    const validatedPermissions = validatePermissions(permissions);

    const updated = await this.accessProfilesRepository.update(
      id,
      { nome: trimmedNome, descricao, allowedWarehouses },
      validatedPermissions,
    );
    if (!updated) {
      throw new NotFoundError('Perfil de acesso não encontrado.');
    }

    logAction(req, {
      action: 'update',
      entityType: 'AccessProfile',
      entityId: updated.id,
      entityDescription: updated.nome,
      oldValues: { nome: before.nome, descricao: before.descricao, permissions: before.permissions },
      newValues: { nome: updated.nome, descricao: updated.descricao, permissions: validatedPermissions },
      description: `Perfil de acesso "${updated.nome}" atualizado`,
    });

    return updated;
  }
}

export = UpdateAccessProfileUseCase;
