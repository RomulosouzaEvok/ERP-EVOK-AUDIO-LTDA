/**
 * 🏢 Model: CompanyFiscalConfig (Configuração Fiscal do Emitente)
 *
 * @module models/CompanyFiscalConfig
 *
 * Tabela singleton (uma única linha, id=1) com os dados do emitente
 * (a própria empresa) usados na emissão de NF-e: razão social, CNPJ, IE,
 * regime tributário (CRT), endereço, série/numeração da NF-e e qual
 * provedor de emissão está configurado.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface CompanyFiscalConfigAttributes {
  id: number;
  legal_name: string;
  trade_name: string | null;
  cnpj: string;
  ie: string | null;
  im: string | null;
  crt: '1' | '2' | '3';
  cnae: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  city_ibge_code: string | null;
  state: string | null;
  nfe_series: number;
  nfe_next_number: number;
  nfe_environment: 'homologacao' | 'producao';
  nfe_provider: 'mock' | 'focus_nfe' | 'enotas';
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CompanyFiscalConfig = sequelize.define('CompanyFiscalConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  legal_name: { type: DataTypes.STRING(200), allowNull: false },
  trade_name: DataTypes.STRING(200),
  cnpj: { type: DataTypes.STRING(18), allowNull: false },
  ie: DataTypes.STRING(20),
  im: DataTypes.STRING(20),
  crt: { type: DataTypes.ENUM('1', '2', '3'), allowNull: false, defaultValue: '3', comment: '1=Simples Nacional, 2=Simples Excesso, 3=Regime Normal' },
  cnae: DataTypes.STRING(10),
  cep: DataTypes.STRING(10),
  street: DataTypes.STRING(200),
  number: DataTypes.STRING(20),
  complement: DataTypes.STRING(100),
  neighborhood: DataTypes.STRING(100),
  city: DataTypes.STRING(100),
  city_ibge_code: DataTypes.STRING(7),
  state: DataTypes.STRING(2),
  nfe_series: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  nfe_next_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  nfe_environment: { type: DataTypes.ENUM('homologacao', 'producao'), allowNull: false, defaultValue: 'homologacao' },
  nfe_provider: { type: DataTypes.ENUM('mock', 'focus_nfe', 'enotas'), allowNull: false, defaultValue: 'mock' },
}, {
  tableName: 'company_fiscal_config',
  underscored: true,
  timestamps: true,
});

export = CompanyFiscalConfig;
