/**
 * ⚖️ Model: JurLegalCase (Processo Judicial/Administrativo)
 *
 * @module models/JurLegalCase
 *
 * Tabela `jur_legal_cases` (migration `20260807-000263`, UC-53,
 * RF-JUR-012/019). Parte contrária tem no máximo UMA FK opcional
 * preenchida entre `opposing_party_employee_id`/`_supplier_id`/`_client_id`
 * (CHECK de banco) — quando nenhuma se aplica, apenas
 * `opposing_party_name` (texto livre) é usado. Nunca excluído fisicamente
 * (RF-JUR-019/044).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type CaseType = 'labor' | 'civil' | 'tax' | 'consumer' | 'regulatory' | 'administrative';
type CaseRole = 'plaintiff' | 'defendant' | 'third_party';
type CaseStatus = 'active' | 'won' | 'lost' | 'settled' | 'archived';

interface JurLegalCaseAttributes {
  id: number;
  case_number: string;
  case_type: CaseType;
  case_role: CaseRole;
  opposing_party_name: string;
  opposing_party_employee_id: number | null;
  opposing_party_supplier_id: number | null;
  opposing_party_client_id: number | null;
  court: string | null;
  external_lawyer_id: number | null;
  claim_value: string | null;
  internal_responsible_user_id: number;
  status: CaseStatus;
  outcome_amount: string | null;
  outcome_installments: number | null;
  closed_at: Date | null;
  next_risk_reassessment_due_at: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurLegalCase = sequelize.define<any, JurLegalCaseAttributes>('JurLegalCase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  case_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  case_type: { type: DataTypes.ENUM('labor', 'civil', 'tax', 'consumer', 'regulatory', 'administrative'), allowNull: false },
  case_role: { type: DataTypes.ENUM('plaintiff', 'defendant', 'third_party'), allowNull: false },
  opposing_party_name: { type: DataTypes.STRING(200), allowNull: false },
  opposing_party_employee_id: { type: DataTypes.INTEGER, allowNull: true },
  opposing_party_supplier_id: { type: DataTypes.INTEGER, allowNull: true },
  opposing_party_client_id: { type: DataTypes.INTEGER, allowNull: true },
  court: { type: DataTypes.STRING(150), allowNull: true },
  external_lawyer_id: { type: DataTypes.INTEGER, allowNull: true },
  claim_value: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  internal_responsible_user_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'won', 'lost', 'settled', 'archived'), allowNull: false, defaultValue: 'active' },
  outcome_amount: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  outcome_installments: { type: DataTypes.INTEGER, allowNull: true },
  closed_at: { type: DataTypes.DATE, allowNull: true },
  next_risk_reassessment_due_at: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_legal_cases',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['case_type'] },
    { fields: ['internal_responsible_user_id'] },
    { fields: ['opposing_party_employee_id'] },
    { fields: ['external_lawyer_id'] },
  ],
});

export = JurLegalCase;
