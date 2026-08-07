/**
 * ⚖️ Model: JurLgpdDataSubjectRequest (Solicitação de Titular — LGPD art. 18)
 *
 * @module models/JurLgpdDataSubjectRequest
 *
 * Tabela `jur_lgpd_data_subject_requests` (migration `20260807-000271`,
 * RF-JUR-037 a 039). Model criado nesta passada (P0); endpoints do Grupo 6
 * (LGPD) ficam para a passada 2. `due_date` = `received_at + 15 dias`
 * (art. 19, II), calculada em aplicação — sem `DEFAULT` de banco.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type RequestType = 'confirmation' | 'access' | 'correction' | 'anonymization' | 'deletion' | 'portability' | 'consent_revocation' | 'info_sharing';
type RequestStatus = 'received' | 'verifying' | 'in_progress' | 'answered' | 'rejected_justified';

interface JurLgpdDataSubjectRequestAttributes {
  id: number;
  request_type: RequestType;
  requester_name: string;
  requester_document: string | null;
  requester_email: string | null;
  data_subject_category: string | null;
  received_at: Date;
  due_date: string;
  status: RequestStatus;
  identity_verified: boolean;
  identity_verified_by: number | null;
  identity_verified_at: Date | null;
  rejection_justification: string | null;
  resolution_notes: string | null;
  answered_at: Date | null;
  dpo_user_id: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const JurLgpdDataSubjectRequest = sequelize.define<any, JurLgpdDataSubjectRequestAttributes>('JurLgpdDataSubjectRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  request_type: {
    type: DataTypes.ENUM('confirmation', 'access', 'correction', 'anonymization', 'deletion', 'portability', 'consent_revocation', 'info_sharing'),
    allowNull: false,
  },
  requester_name: { type: DataTypes.STRING(200), allowNull: false },
  requester_document: { type: DataTypes.STRING(20), allowNull: true },
  requester_email: { type: DataTypes.STRING(150), allowNull: true },
  data_subject_category: { type: DataTypes.STRING(100), allowNull: true },
  received_at: { type: DataTypes.DATE, allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('received', 'verifying', 'in_progress', 'answered', 'rejected_justified'), allowNull: false, defaultValue: 'received' },
  identity_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  identity_verified_by: { type: DataTypes.INTEGER, allowNull: true },
  identity_verified_at: { type: DataTypes.DATE, allowNull: true },
  rejection_justification: { type: DataTypes.TEXT, allowNull: true },
  resolution_notes: { type: DataTypes.TEXT, allowNull: true },
  answered_at: { type: DataTypes.DATE, allowNull: true },
  dpo_user_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_lgpd_data_subject_requests',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['status'] }, { fields: ['due_date'] }, { fields: ['dpo_user_id'] }],
});

export = JurLgpdDataSubjectRequest;
