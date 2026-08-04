/**
 * 🔐 Model: AccessProfilePermission (Matriz de Permissões do Perfil)
 *
 * @module models/AccessProfilePermission
 *
 * Uma linha por módulo concedido a um `AccessProfile`. A ausência de
 * linha para um módulo significa `nenhum` acesso (módulo some do menu,
 * API responde 403). A presença da linha já implica visibilidade
 * (`view` implícito); `level = 'approve'` inclui as permissões de
 * `'operate'`.
 *
 * Regras de Negócio (docs/business/BUSINESS_RULES.md §1, §4):
 * - `module` deve corresponder a uma chave da matriz fixa de módulos do
 *   sistema (validação de aplicação, não constraint de banco)
 * - `UNIQUE(access_profile_id, module)` — no máximo uma permissão por
 *   módulo por perfil
 * - `level = 'approve'` só é efetivo em ações de aprovação quando o
 *   usuário também tem `nivel = gestor` (segunda trava, fora do escopo
 *   desta tabela — ver middleware `authorizeModule`)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

/** @interface Atributos da entidade AccessProfilePermission */
export interface AccessProfilePermissionAttributes {
  id: number;
  accessProfileId: number;
  module: string;
  level: 'operate' | 'approve';
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/** @interface Atributos para criação (id opcional) */
export interface AccessProfilePermissionCreationAttributes {
  id?: number;
  accessProfileId: number;
  module: string;
  level: 'operate' | 'approve';
}

const AccessProfilePermission = sequelize.define('AccessProfilePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Identificador único da permissão',
  },
  accessProfileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'access_profile_id',
    comment: 'Perfil de acesso dono desta permissão',
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Chave do módulo conforme a matriz de BUSINESS_RULES.md §1 (ex.: compras, estoque, producao)',
  },
  level: {
    type: DataTypes.ENUM('operate', 'approve'),
    allowNull: false,
    comment: 'Nível de acesso ao módulo — presença da linha = visível; approve inclui operate',
  },
}, {
  tableName: 'access_profile_permissions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['access_profile_id', 'module'], unique: true, name: 'uq_access_profile_permissions_profile_module' },
    { fields: ['access_profile_id'], name: 'idx_access_profile_permissions_profile_id' },
  ],
});

export = AccessProfilePermission;
