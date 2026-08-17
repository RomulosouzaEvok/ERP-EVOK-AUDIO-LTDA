import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const JurLgpdDpoDesignation = sequelize.define<any>('JurLgpdDpoDesignation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  effective_until: { type: DataTypes.DATEONLY, allowNull: true },
  designation_notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_lgpd_dpo_designations',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['status'] }, { fields: ['user_id'] }],
});

export = JurLgpdDpoDesignation;
