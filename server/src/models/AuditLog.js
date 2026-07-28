const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  
  // Quem
  user_id: { type: DataTypes.INTEGER },
  user_name: DataTypes.STRING(200),
  user_ip: DataTypes.STRING(45),
  user_agent: DataTypes.STRING(255),
  
  // O quê
  action: {
    type: DataTypes.ENUM(
      'create', 'update', 'delete', 'soft_delete',
      'login', 'logout', 'password_change',
      'status_change', 'approve', 'reject',
      'price_change', 'salary_change',
      'export', 'import', 'print'
    ),
    allowNull: false
  },
  
  // Em quê
  entity_type: { type: DataTypes.STRING(50), allowNull: false },
  entity_id: { type: DataTypes.INTEGER },
  entity_description: DataTypes.STRING(255),
  
  // Detalhes
  old_values: { type: DataTypes.JSON },
  new_values: { type: DataTypes.JSON },
  description: DataTypes.TEXT,
  
  // Resultado
  success: { type: DataTypes.BOOLEAN, defaultValue: true },
  error_message: DataTypes.TEXT,
  
  // Metadata
  route: DataTypes.STRING(100),
  method: DataTypes.STRING(10)
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['action'] },
    { fields: ['created_at'] }
  ]
});

// Hook para registrar automaticamente
AuditLog.register = async function({ userId, userName, action, entityType, entityId, entityDescription, oldValues, newValues, description, req, success = true, errorMessage } = {}) {
  try {
    await AuditLog.create({
      user_id: userId || (req && req.user && req.user.id),
      user_name: userName || (req && req.user && req.user.name),
      user_ip: req && (req.ip || req.connection.remoteAddress),
      user_agent: req && req.headers && req.headers['user-agent'],
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_description: entityDescription,
      old_values: oldValues,
      new_values: newValues,
      description: description || `${action} em ${entityType} #${entityId}`,
      success,
      error_message: errorMessage,
      route: req && req.originalUrl,
      method: req && req.method
    });
  } catch (error) {
    console.error('Erro ao registrar audit log:', error.message);
  }
};

module.exports = AuditLog;

