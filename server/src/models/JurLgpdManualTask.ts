import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const JurLgpdManualTask = sequelize.define<any>('JurLgpdManualTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_type: { type: DataTypes.ENUM('deletion_review', 'anonymization_review'), allowNull: false },
  status: { type: DataTypes.ENUM('open', 'completed', 'cancelled'), allowNull: false, defaultValue: 'open' },
  data_subject_request_id: { type: DataTypes.INTEGER, allowNull: false },
  assigned_to_user_id: { type: DataTypes.INTEGER, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'jur_lgpd_manual_tasks',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['data_subject_request_id'] }, { fields: ['assigned_to_user_id', 'status'] }],
});

export = JurLgpdManualTask;
