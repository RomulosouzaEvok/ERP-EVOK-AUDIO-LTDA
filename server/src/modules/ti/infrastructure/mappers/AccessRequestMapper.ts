/**
 * Mapper de saída do recurso ItAccessRequest (UC-51).
 *
 * @module modules/ti/infrastructure/mappers/AccessRequestMapper
 */

function plain(row: any): any {
  return row && typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância `ItAccessRequest` para o DTO de resposta. */
export function toAccessRequestDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    request_number: p.request_number,
    type: p.type,
    employee: p.employee ? { id: p.employee.id, name: p.employee.name } : { id: p.employee_id },
    department: p.department ? { id: p.department.id, name: p.department.name } : { id: p.department_id },
    requested_profile: p.requestedProfile ? { id: p.requestedProfile.id, name: p.requestedProfile.nome } : null,
    justification: p.justification,
    corporate_email: p.corporate_email,
    equipment_needed: p.equipment_needed,
    requested_by: p.requestedByUser ? { id: p.requestedByUser.id, name: p.requestedByUser.name } : p.requested_by,
    approved_by: p.approvedByUser ? { id: p.approvedByUser.id, name: p.approvedByUser.name } : p.approved_by,
    approved_at: p.approved_at,
    executed_by: p.executedByUser ? { id: p.executedByUser.id, name: p.executedByUser.name } : p.executed_by,
    executed_at: p.executed_at,
    execution_notes: p.execution_notes,
    status: p.status,
    rejection_reason: p.rejection_reason,
    checklist: p.checklist,
    createdAt: p.createdAt,
  };
}
