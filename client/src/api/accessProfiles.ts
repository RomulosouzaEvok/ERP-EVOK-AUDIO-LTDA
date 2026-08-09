import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

/**
 * Chave estável de módulo — espelha `server/src/shared/domain/accessModules.ts`
 * (30 módulos). `manutencao`/`garantia` adicionados no Bloco A/E
 * (`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`), cobrindo os
 * departamentos novos "Manutenção" e "Ativos & Garantia". `comex` adicionado
 * em 2026-08-06 (UC-19) para o módulo de Importação/COMEX. `facilities`
 * adicionado em 2026-08-07 para o módulo Facilities (departamento 17, FAC).
 * `marketing` adicionado em 2026-08-07 para o módulo Marketing
 * (departamento 14, MKT). `juridico` adicionado em 2026-08-07 para o
 * módulo Jurídico (departamento 16, JUR). `contabilidade` adicionado em
 * 2026-08-07 para o módulo Contabilidade (subárea CONT do Financeiro).
 * `tesouraria` adicionado em 2026-08-07 para o módulo Tesouraria (subárea
 * TES do Financeiro). `controladoria` adicionado em 2026-08-07 para o
 * módulo Controladoria (subárea CTR do Financeiro, orçamento). `diretor`
 * adicionado em 2026-08-08 (correção RF-JUR-003 do módulo Jurídico) — papel
 * de aprovador de alçada de contrato por valor, sem tela/rota própria, só
 * concede o direito de aprovar via `POST /api/jur/contracts/:id/approve`.
 */
export type AccessModuleKey =
  | 'dashboard'
  | 'produtos'
  | 'contagens'
  | 'vendas'
  | 'clientes'
  | 'compras'
  | 'requisicoes'
  | 'fornecedores'
  | 'comex'
  | 'producao'
  | 'bom'
  | 'mrp'
  | 'chao_de_fabrica'
  | 'centros_de_trabalho'
  | 'qualidade'
  | 'laboratorio'
  | 'engenharia'
  | 'estoque'
  | 'recebimento'
  | 'expedicao'
  | 'patrimonio'
  | 'manutencao'
  | 'garantia'
  | 'rh'
  | 'sst'
  | 'ti'
  | 'facilities'
  | 'marketing'
  | 'juridico'
  | 'diretor'
  | 'contabilidade'
  | 'tesouraria'
  | 'controladoria'
  | 'rastreabilidade'
  | 'financeiro'
  | 'relatorios.producao'
  | 'relatorios.compras'
  | 'relatorios.custos'
  | 'relatorios.financeiro';

/** Nível de permissão de um perfil sobre um módulo. */
export type AccessModuleLevel = 'operate' | 'approve';

/** Descritor de módulo (chave + rótulo pt-BR), retornado por `GET /api/access-profiles/modules`. */
export interface AccessModuleDescriptor {
  key: AccessModuleKey;
  label: string;
}

/** Uma linha da matriz de permissões de um perfil de acesso. */
export interface AccessProfilePermission {
  module: AccessModuleKey;
  level: AccessModuleLevel;
}

/** Perfil de acesso configurável (UC-30 a UC-33). */
export interface AccessProfile {
  id: number;
  nome: string;
  descricao: string | null;
  allowedWarehouses: string[] | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions: AccessProfilePermission[];
  userCount: number;
}

export interface AccessProfileInput {
  nome: string;
  descricao?: string | null;
  allowed_warehouses?: string[] | null;
  permissions: AccessProfilePermission[];
}

/** `GET /api/access-profiles` — lista todos os perfis (ativos e inativos, não paginado). */
export async function listAccessProfiles(): Promise<AccessProfile[]> {
  const { data } = await httpClient.get<ItemResponse<AccessProfile[]>>('/api/access-profiles');
  return data.data;
}

/** `GET /api/access-profiles/modules` — lista os 26 módulos atribuíveis, com rótulo pt-BR. */
export async function listAccessModules(): Promise<AccessModuleDescriptor[]> {
  const { data } = await httpClient.get<ItemResponse<AccessModuleDescriptor[]>>('/api/access-profiles/modules');
  return data.data;
}

/** `GET /api/access-profiles/:id`. */
export async function getAccessProfile(id: number): Promise<AccessProfile> {
  const { data } = await httpClient.get<ItemResponse<AccessProfile>>(`/api/access-profiles/${id}`);
  return data.data;
}

/** `POST /api/access-profiles` — cria um novo perfil (UC-30). */
export async function createAccessProfile(input: AccessProfileInput): Promise<AccessProfile> {
  const { data } = await httpClient.post<ItemResponse<AccessProfile>>('/api/access-profiles', input);
  return data.data;
}

/** `PUT /api/access-profiles/:id` — edita um perfil existente (UC-31). */
export async function updateAccessProfile(id: number, input: AccessProfileInput): Promise<AccessProfile> {
  const { data } = await httpClient.put<ItemResponse<AccessProfile>>(`/api/access-profiles/${id}`, input);
  return data.data;
}

/** `DELETE /api/access-profiles/:id` — desativa (soft delete) um perfil (UC-32). Pode retornar 422 se houver usuários ativos vinculados. */
export async function deactivateAccessProfile(id: number): Promise<{ id: number; nome: string; active: false }> {
  const { data } = await httpClient.delete<ItemResponse<{ id: number; nome: string; active: false }>>(`/api/access-profiles/${id}`);
  return data.data;
}

/** `PUT /api/users/:id/access-profile` — atribui (ou remove, com `null`) o perfil de acesso de um usuário (UC-33). */
export async function assignAccessProfile(userId: number, accessProfileId: number | null): Promise<{ id: number; accessProfileId: number | null }> {
  const { data } = await httpClient.put<ItemResponse<{ id: number; accessProfileId: number | null }>>(`/api/users/${userId}/access-profile`, {
    access_profile_id: accessProfileId,
  });
  return data.data;
}

/** `GET /api/auth/me/permissions` — mapa module→nível do usuário autenticado (UC-34). */
export interface MyPermissions {
  modules: Partial<Record<AccessModuleKey, AccessModuleLevel>>;
  profile: { id: number; nome: string } | null;
}

export async function getMyPermissions(): Promise<MyPermissions> {
  const { data } = await httpClient.get<ItemResponse<MyPermissions>>('/api/auth/me/permissions');
  return data.data;
}
