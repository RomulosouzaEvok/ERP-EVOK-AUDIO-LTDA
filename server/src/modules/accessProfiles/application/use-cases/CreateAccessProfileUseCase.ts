import type { Request } from 'express';
import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, ValidationError } from '../../../../errors';
import AccessProfilesRepository, { AccessProfileListItem, AccessProfilePermissionInput } from '../../domain/repositories/AccessProfilesRepository';
import { validatePermissions } from './validatePermissions';

const { logAction } = require('../../../../services/auditLogService');

export interface CreateAccessProfileInput {
  nome: string;
  descricao?: string | null;
  allowedWarehouses?: string[] | null;
  permissions: AccessProfilePermissionInput[];
  req: Request;
}

/**
 * `POST /api/access-profiles` — cria um novo perfil de acesso configurável
 * (UC-30), com sua matriz de permissões, em uma única transação Sequelize.
 *
 * Regras (`docs/business/01-USE_CASES.md` UC-30, `BUSINESS_RULES.md` §1/§3):
 * - `nome` obrigatório e único (409 `ConflictError` na duplicidade).
 * - Ao menos uma permissão deve ser informada (perfil vazio não faz
 *   sentido — 422 `ValidationError`).
 * - Cada `permissions[].module` deve ser uma chave válida da matriz fixa
 *   (`ACCESS_MODULES`) e `level` deve ser `'operate'|'approve'` — módulos
 *   duplicados no payload são rejeitados (a unicidade
 *   `(access_profile_id, module)` é também garantida pelo banco, mas
 *   validamos antes para uma mensagem didática).
 * - Toda criação é auditada via `logAction` (`action: 'create'`, `entity: 'AccessProfile'`).
 */
class CreateAccessProfileUseCase extends UseCase<CreateAccessProfileInput, AccessProfileListItem> {
  private readonly accessProfilesRepository: AccessProfilesRepository;

  public constructor(accessProfilesRepository: AccessProfilesRepository) {
    super();
    this.accessProfilesRepository = accessProfilesRepository;
  }

  /**
   * @param input - Dados do novo perfil e a requisição original (para `logAction`).
   * @returns Perfil de acesso criado, com permissões e `userCount = 0`.
   * @throws {ValidationError} Se `nome` estiver vazio, `permissions` estiver vazio, ou houver `module`/`level` inválido/duplicado.
   * @throws {ConflictError} Se já existir um perfil com o mesmo `nome`.
   */
  public async execute({ nome, descricao, allowedWarehouses, permissions, req }: CreateAccessProfileInput): Promise<AccessProfileListItem> {
    const trimmedNome = (nome ?? '').trim();
    if (!trimmedNome) {
      throw new ValidationError('Nome do perfil é obrigatório.');
    }

    const validatedPermissions = validatePermissions(permissions);

    const duplicate = await this.accessProfilesRepository.findByNome(trimmedNome);
    if (duplicate) {
      throw new ConflictError('Já existe um perfil com este nome.');
    }

    const created = await this.accessProfilesRepository.create(
      { nome: trimmedNome, descricao: descricao ?? null, allowedWarehouses: allowedWarehouses ?? null },
      validatedPermissions,
    );

    logAction(req, {
      action: 'create',
      entityType: 'AccessProfile',
      entityId: created.id,
      entityDescription: created.nome,
      newValues: { nome: created.nome, descricao: created.descricao, permissions: validatedPermissions },
      description: `Perfil de acesso "${created.nome}" criado`,
    });

    return created;
  }
}

export = CreateAccessProfileUseCase;
