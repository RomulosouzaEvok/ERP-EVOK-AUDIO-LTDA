/**
 * 🏦 Model: CompanyBankingConfig (Configuração Bancária da Empresa — CNAB)
 *
 * @module models/CompanyBankingConfig
 *
 * Tabela singleton (uma única linha, id=1) com os dados bancários do
 * cedente (a própria empresa) usados na geração de remessa CNAB 240
 * (`server/src/modules/financial/infrastructure/cnab`): banco, agência,
 * conta, código do convênio, carteira, e os contadores sequenciais de
 * "nosso número" e de número de remessa (nunca reaproveitados — cada
 * remessa gerada e cada título registrado incrementam o contador
 * correspondente, mesmo em caso de erro após a geração).
 *
 * DECISÃO ARQUITETURAL: mantida como tabela própria do módulo `financial`
 * (não como colunas em `company_fiscal_config`, que é do módulo fiscal/NF-e)
 * para não acoplar dois domínios de configuração distintos (emissão fiscal
 * vs. cobrança bancária) na mesma tabela/agente responsável.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CompanyBankingConfigAttributes {
  id: number;
  bank_code: string;
  bank_name: string;
  agency: string;
  agency_dv: string | null;
  account_number: string;
  account_dv: string | null;
  agency_account_dv: string | null;
  covenant_code: string;
  wallet_code: string;
  company_document: string;
  company_legal_name: string;
  next_our_number: number;
  next_remittance_number: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CompanyBankingConfig = sequelize.define('CompanyBankingConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bank_code: { type: DataTypes.STRING(3), allowNull: false, comment: 'Código COMPE do banco (ex.: "341" Itaú, "001" BB)' },
  bank_name: { type: DataTypes.STRING(30), allowNull: false },
  agency: { type: DataTypes.STRING(5), allowNull: false },
  agency_dv: { type: DataTypes.STRING(1), allowNull: true },
  account_number: { type: DataTypes.STRING(12), allowNull: false },
  account_dv: { type: DataTypes.STRING(1), allowNull: true },
  agency_account_dv: { type: DataTypes.STRING(1), allowNull: true },
  covenant_code: { type: DataTypes.STRING(20), allowNull: false, comment: 'Código do convênio/cedente no banco' },
  wallet_code: { type: DataTypes.STRING(1), allowNull: false, comment: 'Código da carteira de cobrança' },
  company_document: { type: DataTypes.STRING(14), allowNull: false, comment: 'CNPJ (ou CPF) do cedente, apenas dígitos' },
  company_legal_name: { type: DataTypes.STRING(30), allowNull: false, comment: 'Razão social truncada a 30 posições (largura do campo CNAB) — nome completo fica em company_fiscal_config.legal_name' },
  next_our_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, comment: 'Próximo nosso-número a reservar (incrementado por título gerado, sob lock — nunca reaproveitado, mesmo se a remessa falhar depois)' },
  next_remittance_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, comment: 'Próximo número sequencial de arquivo de remessa (incrementado por remessa gerada)' },
}, {
  tableName: 'company_banking_config',
  underscored: true,
  timestamps: true,
});

export = CompanyBankingConfig;
