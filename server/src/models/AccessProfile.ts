/**
 * 🔐 Model: AccessProfile (Perfil de Acesso por Área/Departamento)
 *
 * @module models/AccessProfile
 *
 * Perfil configurável de acesso por área (ex.: "Almoxarife", "Comprador").
 * O administrador cria/edita perfis marcando, módulo a módulo, o nível de
 * acesso (ver `AccessProfilePermission`). Um usuário pertence a, no
 * máximo, um perfil ativo por vez (`users.access_profile_id`).
 *
 * Regras de Negócio (docs/business/BUSINESS_RULES.md, docs/business/01-USE_CASES.md UC-30 a UC-33):
 * - `nome` único (409 na duplicidade)
 * - `active = false` (soft delete) é bloqueado enquanto houver usuário
 *   ativo vinculado ao perfil (UC-32) — regra aplicada na camada de
 *   aplicação, não em constraint de banco
 * - `allowed_warehouses`: lista simples (JSONB) de depósitos permitidos
 *   ao perfil dentro dos módulos de estoque; `null` = sem restrição por
 *   depósito (BUSINESS_RULES.md §12)
 * - Usuário sem `access_profile_id` (null) = bloqueio total de módulos de
 *   área (UC-35-Exceção) — nunca atribuído automaticamente em backfill
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

/** @interface Atributos da entidade AccessProfile */
export interface AccessProfileAttributes {
  id: number;
  nome: string;
  descricao: string | null;
  allowedWarehouses: string[] | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/** @interface Atributos para criação (id opcional) */
export interface AccessProfileCreationAttributes {
  id?: number;
  nome: string;
  descricao?: string | null;
  allowedWarehouses?: string[] | null;
  active?: boolean;
}

const AccessProfile = sequelize.define('AccessProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Identificador único do perfil de acesso',
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Nome do perfil de acesso (ex.: Almoxarife, Comprador)',
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição livre do perfil de acesso',
  },
  allowedWarehouses: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'allowed_warehouses',
    comment: 'Lista simples de depósitos permitidos ao perfil (null = sem restrição por depósito)',
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Status ativo/inativo (soft delete) — bloqueado enquanto houver usuário ativo vinculado (UC-32)',
  },
}, {
  tableName: 'access_profiles',
  underscored: true,
  timestamps: true,
});

export = AccessProfile;
