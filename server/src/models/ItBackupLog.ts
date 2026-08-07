/**
 * 💻 Model: ItBackupLog (Evidência de Backup/Teste de Restore)
 *
 * @module models/ItBackupLog
 *
 * Tabela `it_backup_logs` (migration `20260807-000155`). Alimentada por
 * script pós-cron (autenticação de aplicação) e/ou registro manual do
 * teste de restore (RF-TI-039 a 042).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type BackupType = 'daily' | 'weekly' | 'monthly' | 'restore_test';

interface ItBackupLogAttributes {
  id: number;
  executed_at: Date;
  backup_type: BackupType;
  target: string;
  destination: string | null;
  size_bytes: number | null;
  success: boolean;
  error_message: string | null;
  generated_ticket_id: number | null;
  verified_by: number | null;
  notes: string | null;
  readonly createdAt?: Date;
}

const ItBackupLog = sequelize.define<any, ItBackupLogAttributes>('ItBackupLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  executed_at: { type: DataTypes.DATE, allowNull: false },
  backup_type: { type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'restore_test'), allowNull: false },
  target: { type: DataTypes.STRING(50), allowNull: false },
  destination: DataTypes.STRING(255),
  size_bytes: DataTypes.BIGINT,
  success: { type: DataTypes.BOOLEAN, allowNull: false },
  error_message: DataTypes.TEXT,
  generated_ticket_id: { type: DataTypes.INTEGER, allowNull: true },
  verified_by: { type: DataTypes.INTEGER, allowNull: true },
  notes: DataTypes.TEXT,
}, {
  tableName: 'it_backup_logs',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['backup_type', 'executed_at'] },
    { fields: ['success'] },
  ],
});

export = ItBackupLog;
