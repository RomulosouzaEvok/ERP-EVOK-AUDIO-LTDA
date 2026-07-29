/**
 * 🏢 Model: Supplier (Fornecedores)
 *
 * @module models/Supplier
 *
 * Gerencia cadastro de fornecedores com validação de CNPJ,
 * avaliação (rating) e condições comerciais.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface SupplierAttributes {
  id: number;
  company_name: string;
  trade_name: string;
  cnpj: string;
  ie: string | null;
  phone: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
  delivery_time: number;
  rating: number;
  status: 'active' | 'inactive' | 'blocked';
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Razão Social' },
  trade_name: { type: DataTypes.STRING(200), defaultValue: '', comment: 'Nome Fantasia' },
  cnpj: { type: DataTypes.STRING(18), allowNull: false, unique: true, comment: 'CNPJ (apenas dígitos)' },
  ie: DataTypes.STRING(20),
  phone: DataTypes.STRING(20),
  email: DataTypes.STRING(100),
  cep: DataTypes.STRING(10),
  street: DataTypes.STRING(200),
  number: DataTypes.STRING(20),
  complement: DataTypes.STRING(100),
  neighborhood: DataTypes.STRING(100),
  city: DataTypes.STRING(100),
  state: DataTypes.STRING(2),
  contact_name: DataTypes.STRING(100),
  contact_phone: DataTypes.STRING(20),
  payment_terms: DataTypes.STRING(100),
  delivery_time: { type: DataTypes.INTEGER, defaultValue: 15, comment: 'Prazo de entrega (dias)' },
  rating: { type: DataTypes.INTEGER, defaultValue: 3, comment: 'Avaliação (1-5)' },
  status: { type: DataTypes.ENUM('active', 'inactive', 'blocked'), defaultValue: 'active' },
  notes: DataTypes.TEXT
}, {
  tableName: 'suppliers',
  underscored: true,
  timestamps: true
});

export = Supplier;

