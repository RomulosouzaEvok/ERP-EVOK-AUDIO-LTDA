import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const JurLgpdRetentionPolicy = sequelize.define<any>('JurLgpdRetentionPolicy', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category: { type: DataTypes.STRING(120), allowNull: false },
  retention_value: { type: DataTypes.STRING(150), allowNull: false },
  retention_basis: { type: DataTypes.TEXT, allowNull: true },
  auto_delete_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
  legal_guidance_status: { type: DataTypes.ENUM('pending_formal_guidance', 'approved'), allowNull: false, defaultValue: 'pending_formal_guidance' },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'jur_lgpd_retention_policies',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['category', 'status'] }],
});

export = JurLgpdRetentionPolicy;
