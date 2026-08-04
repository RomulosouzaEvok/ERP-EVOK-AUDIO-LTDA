import { ValidationError } from '../../../../errors';
import { isValidAccessModuleKey } from '../../../../shared/domain/accessModules';
import { AccessProfilePermissionInput } from '../../domain/repositories/AccessProfilePermissionInput';

/**
 * Valida a forma da matriz de permissões recebida no payload de
 * criação/edição de um perfil de acesso (UC-30/UC-31).
 *
 * @param permissions - Lista bruta recebida do body da requisição.
 * @returns Lista normalizada (sem duplicidade de módulo).
 * @throws {ValidationError} Se a lista estiver vazia, tiver `module` inválido/duplicado, ou `level` fora de `'operate'|'approve'`.
 */
export function validatePermissions(permissions: unknown): AccessProfilePermissionInput[] {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new ValidationError('Perfil deve conceder acesso a pelo menos um módulo.');
  }

  const seen = new Set<string>();
  const result: AccessProfilePermissionInput[] = [];

  for (const raw of permissions as Array<{ module?: unknown; level?: unknown }>) {
    const module = raw?.module;
    const level = raw?.level;

    if (typeof module !== 'string' || !isValidAccessModuleKey(module)) {
      throw new ValidationError(`Módulo inválido: "${module}". Consulte GET /api/access-profiles/modules para a lista de módulos válidos.`);
    }
    if (level !== 'operate' && level !== 'approve') {
      throw new ValidationError(`Nível de permissão inválido para o módulo "${module}": use "operate" ou "approve".`);
    }
    if (seen.has(module)) {
      throw new ValidationError(`Módulo "${module}" informado mais de uma vez na matriz de permissões.`);
    }
    seen.add(module);
    result.push({ module, level });
  }

  return result;
}

export default validatePermissions;

// Compatibilidade com imports CommonJS legados (`require(...)`) usados no projeto.
module.exports = validatePermissions;
module.exports.validatePermissions = validatePermissions;
module.exports.default = validatePermissions;
