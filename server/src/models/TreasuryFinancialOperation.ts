/**
 * 📄 Model: TreasuryFinancialOperation (Operação Financeira — Tesouraria)
 *
 * @module models/TreasuryFinancialOperation
 *
 * Empréstimos, aplicações financeiras, financiamentos e leasing contratados
 * pela empresa, do módulo Tesouraria (subárea TES do departamento
 * Financeiro — `docs/financeiro/03-TESOURARIA.md`). Ciclo de vida via
 * `status`: `active` (operação em curso) → `settled` (liquidada, via
 * `PATCH /api/treasury/financial-operations/:id/settle`, que também
 * preenche `settled_at`) ou `canceled` (cancelada antes da liquidação
 * natural, via `PATCH /api/treasury/financial-operations/:id/cancel`).
 * Nunca apagada fisicamente — é histórico de contrato financeiro, exige
 * auditoria (mesmo padrão de `AccountingEntry`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TreasuryOperationType = 'loan' | 'investment' | 'financing' | 'leasing';
type TreasuryGuaranteeType = 'aval' | 'fianca' | 'alienacao' | 'recebiveis' | 'none';
type TreasuryOperationStatus = 'active' | 'settled' | 'canceled';

interface TreasuryFinancialOperationAttributes {
  id: number;
  operation_type: TreasuryOperationType;
  institution: string;
  contract_number: string;
  amount: number;
  interest_rate: number | null;
  start_date: string;
  end_date: string | null;
  guarantee_type: TreasuryGuaranteeType;
  status: TreasuryOperationStatus;
  notes: string | null;
  settled_at: string | null;
  created_by: number;
  settled_by: number | null;
  canceled_by: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const TreasuryFinancialOperation = sequelize.define('TreasuryFinancialOperation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  operation_type: {
    type: DataTypes.ENUM('loan', 'investment', 'financing', 'leasing'),
    allowNull: false,
  },
  institution: { type: DataTypes.STRING(100), allowNull: false },
  contract_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  guarantee_type: {
    type: DataTypes.ENUM('aval', 'fianca', 'alienacao', 'recebiveis', 'none'),
    allowNull: false,
    defaultValue: 'none',
  },
  status: {
    type: DataTypes.ENUM('active', 'settled', 'canceled'),
    allowNull: false,
    defaultValue: 'active',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  settled_at: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id de quem criou a operacao' },
  settled_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem liquidou a operacao' },
  canceled_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem cancelou a operacao' },
}, {
  tableName: 'treasury_financial_operations',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['contract_number'], name: 'uq_treasury_financial_operations_contract_number', unique: true },
    { fields: ['status'], name: 'idx_treasury_financial_operations_status' },
    { fields: ['operation_type'], name: 'idx_treasury_financial_operations_operation_type' },
  ],
});

export = TreasuryFinancialOperation;
