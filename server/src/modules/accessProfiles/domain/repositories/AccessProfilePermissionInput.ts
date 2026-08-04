/**
 * @module modules/accessProfiles/domain/repositories/AccessProfilePermissionInput
 *
 * Tipos do domínio de Perfis de Acesso, isolados em arquivo próprio (sem
 * `export =`) para poderem ser importados por nome em outros módulos sem
 * colidir com o `export =` de `AccessProfilesRepository.ts`.
 */

export interface AccessProfilePermissionInput {
  module: string;
  level: 'operate' | 'approve';
}

export interface AccessProfileListItem {
  id: number;
  nome: string;
  descricao: string | null;
  allowedWarehouses: string[] | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  permissions: AccessProfilePermissionInput[];
  userCount: number;
}
