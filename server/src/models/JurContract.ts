/**
 * ⚖️ Model: JurContract (Contrato — módulo Jurídico)
 *
 * @module models/JurContract
 *
 * Tabela `jur_contracts` (migration `20260807-000260`). Núcleo do Bloco 3
 * (UC-52, RF-JUR-001 a 011). Contraparte polimórfica mutuamente exclusiva
 * (`supplier_id` XOR `client_id` XOR `employee_id` XOR
 * `counterparty_name`+`counterparty_doc`), validada em `CHECK` no banco
 * (`ck_jur_contracts_counterparty_exclusive`) E na camada de aplicação
 * (`CreateContractUseCase`). `status` é uma máquina de estados
 * (`draft → in_approval → approved → signed → active → (expired|terminated|canceled)`)
 * — nenhuma rota deste módulo permite `expired`/`terminated → active`
 * (BR-JUR-006).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ContractType =
  | 'commercial' | 'employment' | 'supplier' | 'service' | 'rental'
  | 'nda' | 'distribution' | 'commercial_representation' | 'trademark_license' | 'other';
type CounterpartyType = 'supplier' | 'client' | 'employee' | 'other';
type AdjustmentIndex = 'ipca' | 'igpm' | 'inpc' | 'other' | 'none';
type ContractStatus = 'draft' | 'in_approval' | 'approved' | 'signed' | 'active' | 'expired' | 'terminated' | 'canceled';

interface JurContractAttributes {
  id: number;
  contract_number: string;
  contract_type: ContractType;
  object: string;
  counterparty_type: CounterpartyType;
  supplier_id: number | null;
  client_id: number | null;
  employee_id: number | null;
  counterparty_name: string | null;
  counterparty_doc: string | null;
  value: string | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  renewal_auto: boolean;
  notice_days: number | null;
  adjustment_index: AdjustmentIndex;
  adjustment_base_date: string | null;
  alert_advance_days: number;
  clause_checklist: Record<string, unknown> | null;
  status: ContractStatus;
  approved_by: number | null;
  approved_at: Date | null;
  signed_at: string | null;
  responsible_user_id: number | null;
  termination_reason: string | null;
  termination_date: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurContract = sequelize.define<any, JurContractAttributes>('JurContract', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  contract_type: {
    type: DataTypes.ENUM('commercial', 'employment', 'supplier', 'service', 'rental', 'nda', 'distribution', 'commercial_representation', 'trademark_license', 'other'),
    allowNull: false,
  },
  object: { type: DataTypes.TEXT, allowNull: false },
  counterparty_type: { type: DataTypes.ENUM('supplier', 'client', 'employee', 'other'), allowNull: false },
  supplier_id: { type: DataTypes.INTEGER, allowNull: true },
  client_id: { type: DataTypes.INTEGER, allowNull: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: true },
  counterparty_name: { type: DataTypes.STRING(200), allowNull: true },
  counterparty_doc: { type: DataTypes.STRING(20), allowNull: true },
  value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  renewal_auto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  notice_days: { type: DataTypes.INTEGER, allowNull: true },
  adjustment_index: { type: DataTypes.ENUM('ipca', 'igpm', 'inpc', 'other', 'none'), allowNull: false, defaultValue: 'none' },
  adjustment_base_date: { type: DataTypes.DATEONLY, allowNull: true },
  alert_advance_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
  clause_checklist: { type: DataTypes.JSONB, allowNull: true },
  status: {
    type: DataTypes.ENUM('draft', 'in_approval', 'approved', 'signed', 'active', 'expired', 'terminated', 'canceled'),
    allowNull: false,
    defaultValue: 'draft',
  },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  signed_at: { type: DataTypes.DATEONLY, allowNull: true },
  responsible_user_id: { type: DataTypes.INTEGER, allowNull: true },
  termination_reason: { type: DataTypes.TEXT, allowNull: true },
  termination_date: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_contracts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['contract_type'] },
    { fields: ['supplier_id'] },
    { fields: ['client_id'] },
    { fields: ['employee_id'] },
    { fields: ['end_date'] },
    { fields: ['responsible_user_id'] },
  ],
});

export = JurContract;
