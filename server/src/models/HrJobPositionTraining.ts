/**
 * 🎓 Model: HrJobPositionTraining (Matriz Cargo × Treinamento Obrigatório — módulo RH, Bloco 6)
 *
 * Tabela `hr_job_position_trainings` (migration `20260808-000022`).
 * RF-RH-026/056/058. Vínculo N:N entre `HrJobPosition` e
 * `HrTrainingCourse`, consumido pelo relatório "quem não pode operar"
 * (RF-RH-058). Sem CRUD de rota nesta passada (Grupo 1 — Cargos — não faz
 * parte deste bloco) — usado apenas por leitura.
 *
 * @module models/HrJobPositionTraining
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrJobPositionTraining = sequelize.define('HrJobPositionTraining', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  job_position_id: { type: DataTypes.INTEGER, allowNull: false },
  training_course_id: { type: DataTypes.INTEGER, allowNull: false },
  required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'hr_job_position_trainings',
  underscored: true,
  timestamps: true,
});

export = HrJobPositionTraining;
