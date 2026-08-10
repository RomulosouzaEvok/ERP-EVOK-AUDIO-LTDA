/**
 * 📝 Model: AuditLog (Registro de Auditoria)
 *
 * @module models/AuditLog
 *
 * Registra todas as operações críticas do sistema para rastreabilidade:
 * create, update, delete, login, status_change, approve, reject, etc.
 * Inclui método estático register() para facilitar o logging.
 *
 * ⚠️ `action` NÃO é mais `string`. O vocabulário é fechado e vive em
 * `src/shared/domain/auditActions.ts` (SSOT) — era justamente `action: string`
 * que fazia o `tsc` não enxergar os 37 literais fora do `ENUM` que a varredura
 * de 2026-08-10 encontrou (`docs/governance/auditorias/
 * VARREDURA_ESCRITA_REAL_2026-08-10.md` §2). A lista de `DataTypes.ENUM` abaixo
 * é derivada da mesma constante, para que model e vocabulário não possam
 * divergir de novo.
 */

import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../config/database';
import {
  AUDIT_ACTIONS,
  markAuditActionInDescription,
  resolveAuditAction,
  type AuditAction,
  type AuditActionInput,
} from '../shared/domain/auditActions';

interface AuditLogAttributes {
  id?: number;
  user_id: number | null;
  user_name: string | null;
  user_ip: string | null;
  user_agent: string | null;
  action: AuditAction;
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
    action: AuditActionInput;
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
    // Derivado da SSOT (`shared/domain/auditActions`): model e vocabulário
    // não podem divergir por edição manual. Os 9 valores novos só existem no
    // banco depois de `20260810-000036-extend-audit-log-action-enum.cjs`; até
    // lá `auditLogService` degrada para o valor legado equivalente (ver
    // `AUDIT_ACTION_DB_FALLBACK`), nunca perde o evento.
    type: DataTypes.ENUM(...AUDIT_ACTIONS),
    allowNull: false,
    comment: 'Tipo de ação executada (vocabulário fechado — ver shared/domain/auditActions.ts)'
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
 * `action` é normalizada para o vocabulário canônico
 * (`shared/domain/auditActions`) antes de persistir: um sinônimo de módulo
 * (ex.: `award`) vira o valor canônico (`approve`) e o verbo original é
 * preservado como marcador `[award]` no início da `description`, de modo que
 * a granularidade não se perde e a consulta continua possível
 * (`description LIKE '[award]%'`).
 *
 * @param data - Dados do evento de auditoria.
 */
(AuditLog as unknown as AuditLogModel).register = async function (data: {
  userId?: number | string;
  userName?: string;
  action: AuditActionInput;
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
  // Normalizacao de vocabulario: aqui (e nao no service) para que QUALQUER
  // chamador de `register` fique coberto, inclusive um futuro que nao passe
  // por `logAction`.
  const resolved = resolveAuditAction(data.action);
  const baseDescription = data.description ?? `${resolved.requested} em ${data.entityType} #${data.entityId}`;
  const description = resolved.translated
    ? markAuditActionInDescription(resolved.requested, baseDescription)
    : baseDescription;

  // Propositalmente NAO engole erro aqui: quem decide o que fazer com uma
  // falha de gravacao (retry, degradacao de vocabulario, persistencia em
  // arquivo, alerta via webhook) e `services/auditLogService.ts#logAction`,
  // que envolve esta chamada. Engolir o erro aqui tornaria aquele tratamento
  // morto (nunca acionado) — em particular a degradacao que mantem o evento
  // gravado enquanto a migration `20260810-000036` nao e aplicada.
  await AuditLog.create({
    user_id: data.userId !== undefined ? Number(data.userId) : (data.req?.user?.id ?? null),
    user_name: data.userName ?? data.req?.user?.name ?? null,
    user_ip: (data.req?.ip as string) ?? null,
    user_agent: typeof data.req?.headers?.['user-agent'] === 'string' ? data.req.headers['user-agent'] : null,
    action: resolved.action,
    entity_type: data.entityType,
    entity_id: data.entityId !== undefined && data.entityId !== null ? Number(data.entityId) : null,
    entity_description: data.entityDescription ?? null,
    old_values: data.oldValues ?? null,
    new_values: data.newValues ?? null,
    description,
    success: data.success ?? true,
    error_message: data.errorMessage ?? null,
    route: data.req?.originalUrl ?? null,
    method: data.req?.method ?? null
  });
};

export = AuditLog;
