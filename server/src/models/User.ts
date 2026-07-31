/**
 * 👤 Model: User (Usuários do Sistema)
 *
 * @module models/User
 *
 * Gerencia autenticação, perfis de acesso (admin, operator, financial)
 * e controle de status (ativo/inativo). Utiliza bcrypt para hash de senha.
 *
 * Regras de Negócio:
 * - Senha armazenada com hash bcrypt (10 rounds)
 * - Email deve ser único e válido
 * - Role controla permissões via middleware authorize()
 * - toJSON() remove password da resposta
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

/** @interface Atributos da entidade User */
export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'operator' | 'financial';
  department: string;
  active: boolean;
  passwordVersion: number;
  resetPasswordTokenHash: string | null;
  resetPasswordExpiresAt: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/** @interface Atributos para criação (id opcional) */
export interface UserCreationAttributes {
  id?: number;
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'operator' | 'financial';
  department?: string;
  active?: boolean;
  passwordVersion?: number;
}

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Identificador único do usuário'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Nome completo do usuário'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
    comment: 'Email de acesso ao sistema'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Hash bcrypt da senha'
  },
  role: {
    type: DataTypes.ENUM('admin', 'operator', 'financial'),
    defaultValue: 'operator',
    comment: 'Perfil de acesso: admin=administrador, operator=operador, financial=financeiro'
  },
  department: {
    type: DataTypes.STRING(100),
    defaultValue: '',
    comment: 'Departamento do usuário'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Status ativo/inativo (soft delete)'
  },
  passwordVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'password_version',
    comment: 'Versao de senha, incrementada a cada troca para invalidar tokens JWT antigos'
  },
  resetPasswordTokenHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'reset_password_token_hash',
    comment: 'Hash SHA-256 do token de recuperacao de senha (SEC-12)'
  },
  resetPasswordExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expires_at',
    comment: 'Expiracao do token de recuperacao de senha (SEC-12)'
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  hooks: {
    /**
     * Hook beforeSave: hashea a senha com bcrypt se o campo foi alterado.
     * Executado tanto em create quanto em update.
     */
    beforeSave: async (user: any) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);

        // Qualquer troca de senha (self-service ou administrativa) invalida
        // tokens JWT emitidos anteriormente, incrementando a versao da senha.
        if (!user.isNewRecord) {
          user.passwordVersion = (user.passwordVersion || 1) + 1;
        }
      }
    }
  }
});

/**
 * Compara uma senha candidata com o hash armazenado.
 *
 * @param candidate - Senha em texto plano a ser verificada.
 * @returns Promise<boolean> - true se a senha coincidir.
 */
(User as any).prototype.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Remove o campo password do retorno JSON.
 * Chamado automaticamente pelo Sequelize ao serializar o objeto.
 *
 * @returns Objeto sem o campo password.
 */
(User as any).prototype.toJSON = function (): Record<string, unknown> {
  const values = { ...this.get() };
  delete values.password;
  delete values.resetPasswordTokenHash;
  delete values.resetPasswordExpiresAt;
  return values;
};

export = User;

