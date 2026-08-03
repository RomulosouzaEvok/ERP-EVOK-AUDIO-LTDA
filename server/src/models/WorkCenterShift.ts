/**
 * 🕐 Model: WorkCenterShift (Turno de Centro de Trabalho)
 *
 * @module models/WorkCenterShift
 *
 * Janela de turno produtivo de um `WorkCenter` em um dia da semana
 * (0 = domingo ... 6 = sábado). Usado para o cálculo de capacidade finita
 * disponível por período.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface WorkCenterShiftAttributes {
  id: number;
  work_center_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const WorkCenterShift = sequelize.define('WorkCenterShift', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  work_center_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> work_centers.id' },
  weekday: { type: DataTypes.SMALLINT, allowNull: false, comment: 'Dia da semana: 0=domingo ... 6=sabado' },
  start_time: { type: DataTypes.TIME, allowNull: false, comment: 'Horario de inicio do turno' },
  end_time: { type: DataTypes.TIME, allowNull: false, comment: 'Horario de fim do turno' },
}, {
  tableName: 'work_center_shifts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['work_center_id', 'weekday', 'start_time'], unique: true, name: 'uq_work_center_shifts_center_weekday_start' },
    { fields: ['work_center_id'], name: 'idx_work_center_shifts_work_center_id' },
  ],
});

export = WorkCenterShift;
