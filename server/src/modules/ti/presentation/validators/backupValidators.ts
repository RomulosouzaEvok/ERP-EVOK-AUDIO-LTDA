/**
 * Schema Zod (strict) para o endpoint de registro de Backup
 * (`/api/ti/backup-logs`) — valida `backup_type` contra o enum real de
 * `it_backup_logs`
 * (`server/migrations/20260807-000155-create-it-backup-logs.cjs`) antes de
 * chegar ao Sequelize, evitando `invalid input value for enum` (500) e
 * devolvendo `ValidationError` (400).
 *
 * @module modules/ti/presentation/validators/backupValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const backupTypeEnum = z.enum(['daily', 'weekly', 'monthly', 'restore_test']);

/** `POST /api/ti/backup-logs`. */
export const registerBackupLogSchema = z.object({
  executed_at: z.string().trim().min(1, 'executed_at é obrigatório.'),
  backup_type: backupTypeEnum,
  target: z.string().trim().min(1, 'target é obrigatório.').max(50),
  destination: z.string().trim().max(255).optional(),
  size_bytes: z.coerce.number().int().min(0).optional(),
  success: z.boolean(),
  error_message: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
  verified_by: z.coerce.number().int().positive().optional(),
}).strict();

const schemas = { registerBackupLogSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
