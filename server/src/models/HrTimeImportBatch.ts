/**
 * ⏱️ Model: HrTimeImportBatch (Frequência / Ponto — Grupo 10, módulo RH)
 *
 * Tabela `hr_time_import_batches` (migration `20260812-000045`). Um lote
 * por arquivo AEJ (Arquivo Eletrônico de Jornada, Portaria MTP 671/2021,
 * Anexo IX) importado do software da administradora dos REPs (RWTech/
 * Pointline) — ver `docs/rh/04-FREQUENCIA.md`.
 *
 * @module models/HrTimeImportBatch
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface HrTimeImportBatchAttributes {
  id: number;
  filename: string;
  competencia_inicio: string;
  competencia_fim: string;
  imported_by: number;
  imported_at: Date;
  status: 'uploaded' | 'validated' | 'confirmed' | 'rejected';
  total_lines: number;
  matched_count: number;
  unmatched_count: number;
  rejected_count: number;
  unknown_record_types: Record<string, number> | null;
  rejected_lines: Array<{ line: number; raw: string; reason: string }> | null;
  rejection_reason: string | null;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const HrTimeImportBatch = sequelize.define('HrTimeImportBatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  filename: { type: DataTypes.STRING(255), allowNull: false },
  competencia_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  competencia_fim: { type: DataTypes.DATEONLY, allowNull: false },
  imported_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  imported_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('uploaded', 'validated', 'confirmed', 'rejected'), allowNull: false, defaultValue: 'uploaded' },
  total_lines: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  matched_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  unmatched_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  rejected_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  unknown_record_types: { type: DataTypes.JSONB, allowNull: true },
  rejected_lines: { type: DataTypes.JSONB, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  confirmed_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id' },
  confirmed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'hr_time_import_batches',
  underscored: true,
  timestamps: true,
});

export = HrTimeImportBatch;
