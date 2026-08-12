/**
 * 🎓 Model: HrTrainingCourse (Catálogo de Treinamentos — módulo RH, Bloco 6)
 *
 * Tabela `hr_training_courses` (migration `20260808-000022`). RF-RH-055.
 * Catálogo mais amplo que `sst_matriz_treinamento`/`sst_treinamento`
 * (inclui não-normativo: onboarding, técnico, comportamental) — não duplica
 * o cluster normativo de NR já existente em `modules/sst/`. Sem exclusão
 * física — usa `active: false`.
 *
 * @module models/HrTrainingCourse
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrTrainingCourse = sequelize.define('HrTrainingCourse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  is_normative: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  nr_code: DataTypes.STRING(20),
  validity_months: DataTypes.INTEGER,
  workload_hours: DataTypes.DECIMAL(6, 2),
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'hr_training_courses',
  underscored: true,
  timestamps: true,
});

export = HrTrainingCourse;
