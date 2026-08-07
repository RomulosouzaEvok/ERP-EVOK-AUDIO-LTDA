/**
 * DTOs de entrada do recurso ItBackupLog (P5, backup e continuidade).
 *
 * @module modules/ti/domain/entities/BackupLogTypes
 */

export type BackupType = 'daily' | 'weekly' | 'monthly' | 'restore_test';

export interface RegisterBackupLogInput {
  executed_at: string | Date;
  backup_type: BackupType;
  target: string;
  destination?: string;
  size_bytes?: number;
  success: boolean;
  error_message?: string;
  notes?: string;
  verified_by?: number;
}
