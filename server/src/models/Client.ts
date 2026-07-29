/**
 * 👥 Model: Client (Clientes)
 *
 * @module models/Client
 *
 * Gerencia cadastro de clientes pessoa física (CPF) e jurídica (CNPJ),
 * com validação de documentos fiscais e regime tributário para NF-e.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ClientAttributes {
  id: number;
  name: string;
  cpf_cnpj: string;
  phone: string;
  email: string;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  status: 'active' | 'inactive';
  notes: string;
  tax_regime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null;
  ie: string | null;
  im: string | null;
  ind_final: '0' | '1';
  ind_ie: '1' | '2' | '9';
  cnae: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, comment: 'Identificador único' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome ou Razão Social' },
  cpf_cnpj: { type: DataTypes.STRING(18), allowNull: false, unique: true, comment: 'CPF ou CNPJ (apenas números ou formatado)' },
  phone: { type: DataTypes.STRING(20), defaultValue: '', comment: 'Telefone de contato' },
  email: { type: DataTypes.STRING(100), defaultValue: '', comment: 'Email de contato' },
  cep: DataTypes.STRING(10),
  street: DataTypes.STRING(200),
  number: DataTypes.STRING(20),
  complement: DataTypes.STRING(100),
  neighborhood: DataTypes.STRING(100),
  city: DataTypes.STRING(100),
  state: DataTypes.STRING(2),
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active', comment: 'Status do cadastro' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  tax_regime: { type: DataTypes.ENUM('simples_nacional', 'lucro_presumido', 'lucro_real'), comment: 'Regime tributário' },
  ie: DataTypes.STRING(20),
  im: DataTypes.STRING(20),
  ind_final: { type: DataTypes.ENUM('0', '1'), defaultValue: '0', comment: 'Consumidor final (0=não, 1=sim)' },
  ind_ie: { type: DataTypes.ENUM('1', '2', '9'), defaultValue: '9', comment: 'Contribuinte ICMS (1=contribuinte, 2=isento, 9=não contribuinte)' },
  cnae: DataTypes.STRING(10)
}, {
  tableName: 'clients',
  underscored: true,
  timestamps: true
});

export = Client;

