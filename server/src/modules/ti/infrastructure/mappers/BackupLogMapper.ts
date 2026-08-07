/**
 * Mapper de saída do recurso ItBackupLog (P5).
 *
 * @module modules/ti/infrastructure/mappers/BackupLogMapper
 */

function plain(row: any): any {
  return row && typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância `ItBackupLog` para o DTO de resposta. */
export function toBackupLogDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    executed_at: p.executed_at,
    backup_type: p.backup_type,
    target: p.target,
    destination: p.destination,
    size_bytes: p.size_bytes,
    success: p.success,
    error_message: p.error_message,
    generated_ticket_id: p.generated_ticket_id,
    verified_by: p.verified_by,
    notes: p.notes,
  };
}
