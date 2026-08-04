/**
 * Contrato de repositório do domínio de Perfis de Acesso Configuráveis
 * (UC-30 a UC-36). Implementado por `SequelizeAccessProfilesRepository` na
 * camada de infraestrutura.
 *
 * @module modules/accessProfiles/domain/repositories/AccessProfilesRepository
 */

import { AccessProfilePermissionInput, AccessProfileListItem } from './AccessProfilePermissionInput';

class AccessProfilesRepository {
  /**
   * Lista todos os perfis de acesso, com a matriz de permissões e a
   * contagem de usuários ativos vinculados (UC-30 painel de listagem).
   *
   * @abstract
   * @returns Lista de perfis com permissões e `userCount`.
   */
  async list(): Promise<AccessProfileListItem[]> {
    throw new Error('AccessProfilesRepository.list não implementado.');
  }

  /**
   * Busca um perfil de acesso por id, com a matriz de permissões e a
   * contagem de usuários ativos vinculados.
   *
   * @abstract
   * @param id - Id do perfil.
   * @returns Perfil encontrado ou `null`.
   */
  async findById(_id: number): Promise<AccessProfileListItem | null> {
    throw new Error('AccessProfilesRepository.findById não implementado.');
  }

  /**
   * Busca um perfil de acesso pelo nome exato (para validação de
   * unicidade, UC-30/UC-31).
   *
   * @abstract
   * @param nome - Nome do perfil.
   * @param excludeId - Id a excluir da busca (usado em edição, UC-31).
   * @returns Perfil encontrado ou `null`.
   */
  async findByNome(_nome: string, _excludeId?: number): Promise<{ id: number } | null> {
    throw new Error('AccessProfilesRepository.findByNome não implementado.');
  }

  /**
   * Cria um novo perfil de acesso com sua matriz de permissões, em uma
   * única transação Sequelize (commit/rollback).
   *
   * @abstract
   * @param data - `{ nome, descricao, allowedWarehouses }`.
   * @param permissions - Matriz de permissões a criar junto do perfil.
   * @returns Perfil criado (com permissões e `userCount = 0`).
   */
  async create(
    _data: { nome: string; descricao?: string | null; allowedWarehouses?: string[] | null },
    _permissions: AccessProfilePermissionInput[],
  ): Promise<AccessProfileListItem> {
    throw new Error('AccessProfilesRepository.create não implementado.');
  }

  /**
   * Atualiza um perfil de acesso existente, substituindo integralmente sua
   * matriz de permissões, em uma única transação Sequelize.
   *
   * @abstract
   * @param id - Id do perfil.
   * @param data - Campos a atualizar (`nome`, `descricao`, `allowedWarehouses`).
   * @param permissions - Nova matriz de permissões (substitui a anterior por completo).
   * @returns Perfil atualizado, ou `null` se o id não existir.
   */
  async update(
    _id: number,
    _data: { nome?: string; descricao?: string | null; allowedWarehouses?: string[] | null },
    _permissions: AccessProfilePermissionInput[],
  ): Promise<AccessProfileListItem | null> {
    throw new Error('AccessProfilesRepository.update não implementado.');
  }

  /**
   * Conta quantos usuários ativos (`users.active = true`) estão vinculados
   * a este perfil (`access_profile_id`), para a regra de bloqueio de
   * desativação (UC-32).
   *
   * @abstract
   * @param profileId - Id do perfil.
   * @returns `{ count, users }` — contagem e lista resumida (`id`, `name`, `email`) dos usuários ativos afetados.
   */
  async countActiveUsers(_profileId: number): Promise<{ count: number; users: Array<{ id: number; name: string; email: string }> }> {
    throw new Error('AccessProfilesRepository.countActiveUsers não implementado.');
  }

  /**
   * Marca `active = false` no perfil (soft delete, UC-32).
   *
   * @abstract
   * @param id - Id do perfil.
   * @returns `true` se uma linha foi afetada.
   */
  async deactivate(_id: number): Promise<boolean> {
    throw new Error('AccessProfilesRepository.deactivate não implementado.');
  }
}

export = AccessProfilesRepository;
