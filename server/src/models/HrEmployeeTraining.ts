/**
 * 🎓 Model: HrEmployeeTraining (Conclusão de Treinamento pelo Funcionário — módulo RH, Bloco 6)
 *
 * Tabela `hr_employee_trainings` (migration `20260808-000022`). RF-RH-057.
 * `valid_until` é calculado no use case
 * (`completed_at + HrTrainingCourse.validity_months`) — nunca aceito no
 * payload, nunca coluna gerada no banco (depende de JOIN, que
 * `GENERATED ALWAYS AS` do Postgres não suporta).
 *
 * @module models/HrEmployeeTraining
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrEmployeeTraining = sequelize.define('HrEmployeeTraining', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  training_course_id: { type: DataTypes.INTEGER, allowNull: false },
  completed_at: { type: DataTypes.DATEONLY, allowNull: false },
  instructor_or_provider: DataTypes.STRING(200),
  certificate_file_path: DataTypes.STRING(255),
  valid_until: DataTypes.DATEONLY,
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_employee_trainings',
  underscored: true,
  timestamps: true,
});

export = HrEmployeeTraining;
