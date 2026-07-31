/**
 * 📝 Model: AuditLog (Registro de Auditoria)
 *
 * @module models/AuditLog
 *
 * Registra todas as operações críticas do sistema para rastreabilidade:
 * create, update, delete, login, status_change, approve, reject, etc.
 * Inclui método estático register() para facilitar o logging.
 */

import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../config/database';

export interface AuditLogAttributes {
  id?: number;
  user_id: number | null;
  user_name: string | null;
  user_ip: string | null;
  user_agent: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
  success: boolean;
  error_message: string | null;
  route: string | null;
  method: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

interface AuditLogInstance extends Model<AuditLogAttributes>, AuditLogAttributes {}
interface AuditLogModel extends ModelStatic<AuditLogInstance> {
  register(data: {
    userId?: number | string;
    userName?: string;
    action: string;
    entityType: string;
    entityId?: number | string | null;
    entityDescription?: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    description?: string;
    req?: { user?: { id?: number; name?: string }; ip?: string; headers?: { 'user-agent'?: string }; originalUrl?: string; method?: string };
    success?: boolean;
    errorMessage?: string;
  }): Promise<void>;
}

const AuditLog = sequelize.define<AuditLogInstance>('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, comment: 'FK → users.id (quem executou a ação)' },
  user_name: DataTypes.STRING(200),
  user_ip: DataTypes.STRING(45),
  user_agent: DataTypes.STRING(255),
  action: {
    type: DataTypes.ENUM(
      'create', 'update', 'delete', 'soft_delete',
      'login', 'logout', 'password_change',
      'status_change', 'approve', 'reject',
      'price_change', 'salary_change',
      'export', 'import', 'print'
    ),
    allowNull: false,
    comment: 'Tipo de ação executada'
  },
  entity_type: { type: DataTypes.STRING(50), allowNull: false, comment: 'Tipo de entidade (ex: sale, product, user)' },
  entity_id: { type: DataTypes.INTEGER, comment: 'ID da entidade' },
  entity_description: DataTypes.STRING(255),
  old_values: { type: DataTypes.JSON, comment: 'Valores anteriores (antes da alteração)' },
  new_values: { type: DataTypes.JSON, comment: 'Novos valores (depois da alteração)' },
  description: DataTypes.TEXT,
  success: { type: DataTypes.BOOLEAN, defaultValue: true },
  error_message: DataTypes.TEXT,
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

/**
 * Registra um evento de auditoria de forma simplificada.
 * Extrai automaticamente dados do request (user, IP, user-agent) quando disponíveis.
 *
 * @param data - Dados do evento de auditoria.
 */
(AuditLog as unknown as AuditLogModel).register = async function (data: {
  userId?: number | string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: number | string | null;
  entityDescription?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string;
  req?: { user?: { id?: number; name?: string }; ip?: string; headers?: Record<string, string | string[] | undefined>; originalUrl?: string; method?: string };
  success?: boolean;
  errorMessage?: string;
}): Promise<void> {
  // Propositalmente NAO engole erro aqui: quem decide o que fazer com uma
  // falha de gravacao (retry, persistencia em arquivo, alerta via webhook)
  // e `services/auditLogService.ts#logAction`, que envolve esta chamada.
  // Engolir o erro aqui tornaria aquele tratamento morto (nunca acionado).
  await AuditLog.create({
    user_id: data.userId !== undefined ? Number(data.userId) : (data.req?.user?.id ?? null),
    user_name: data.userName ?? data.req?.user?.name ?? null,
    user_ip: (data.req?.ip as string) ?? null,
    user_agent: typeof data.req?.headers?.['user-agent'] === 'string' ? data.req.headers['user-agent'] : null,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId !== undefined && data.entityId !== null ? Number(data.entityId) : null,
    entity_description: data.entityDescription ?? null,
    old_values: data.oldValues ?? null,
    new_values: data.newValues ?? null,
    description: data.description ?? `${data.action} em ${data.entityType} #${data.entityId}`,
    success: data.success ?? true,
    error_message: data.errorMessage ?? null,
    route: data.req?.originalUrl ?? null,
    method: data.req?.method ?? null
  });
};

export = AuditLog;
