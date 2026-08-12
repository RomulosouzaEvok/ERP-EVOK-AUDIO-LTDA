/**
 * ⏱️ Model: HrTimeImportItem (Frequência / Ponto — Grupo 10, módulo RH)
 *
 * Tabela `hr_time_import_items` (migration `20260812-000045`). Uma linha
 * por funcionário×dia extraída do AEJ. `employee_id` é NULLABLE até o
 * casamento por CPF contra `employees.cpf` — linha "não-casada" preserva
 * `original_registration` (matrícula do arquivo) para o relatório que o RH
 * revisa antes de confirmar o lote. Ver `docs/rh/04-FREQUENCIA.md`.
 *
 * @module models/HrTimeImportItem
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface HrTimeImportItemAttributes {
  id: number;
  batch_id: number;
  employee_id: number | null;
  original_registration: string | null;
  cpf: string | null;
  work_date: string;
  hours_worked: number;
  overtime_50: number;
  overtime_100: number;
  night_hours: number;
  absence: boolean;
  absence_justified: boolean;
  absence_reason: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const HrTimeImportItem = sequelize.define('HrTimeImportItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  batch_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> hr_time_import_batches.id' },
  employee_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> employees.id, NULL ate casar por CPF' },
  original_registration: { type: DataTypes.STRING(30), allowNull: true, comment: 'Matricula original do AEJ, preservada mesmo apos o casamento' },
  cpf: { type: DataTypes.STRING(14), allowNull: true, comment: 'CPF extraido do AEJ (apenas digitos), usado para casar com employees.cpf' },
  work_date: { type: DataTypes.DATEONLY, allowNull: false },
  hours_worked: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  overtime_50: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  overtime_100: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  night_hours: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  absence: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  absence_justified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  absence_reason: { type: DataTypes.STRING(200), allowNull: true },
}, {
  tableName: 'hr_time_import_items',
  underscored: true,
  timestamps: true,
});

export = HrTimeImportItem;
