/**
 * 🏖️ Model: HrVacationSchedule (Programação/Fracionamento de Férias — módulo RH, Bloco 6)
 *
 * Tabela `hr_vacation_schedules` (migration `20260808-000019`). RF-RH-035 a
 * 040 (P0 — UC-67). Nunca excluído fisicamente (trigger
 * `hr_block_delete_vacation_schedule`) — alteração gera novo registro com
 * `superseded_by_id`.
 *
 * @module models/HrVacationSchedule
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrVacationSchedule = sequelize.define('HrVacationSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  accrual_period_id: { type: DataTypes.INTEGER, allowNull: false },
  fraction_number: { type: DataTypes.SMALLINT, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  days: { type: DataTypes.INTEGER, allowNull: false },
  abono: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  abono_days: DataTypes.INTEGER,
  abono_requested_at: DataTypes.DATE,
  notice_sent_at: DataTypes.DATEONLY,
  employee_agreement_confirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  fractioning_justification: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('planejado', 'confirmado', 'em_gozo', 'concluido', 'cancelado'),
    allowNull: false,
    defaultValue: 'planejado',
  },
  revision_reason: DataTypes.TEXT,
  superseded_by_id: DataTypes.INTEGER,
  financial_confirmed_at: DataTypes.DATE,
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_vacation_schedules',
  underscored: true,
  timestamps: true,
});

export = HrVacationSchedule;
