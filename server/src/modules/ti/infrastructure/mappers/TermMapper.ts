/**
 * Mapper de saída do recurso ItResponsibilityTerm (UC-50).
 *
 * @module modules/ti/infrastructure/mappers/TermMapper
 */

function plain(row: any): any {
  return row && typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância `ItResponsibilityTerm` para o DTO de resposta. */
export function toTermDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    term_number: p.term_number,
    asset: p.asset ? { id: p.asset.id, tag: p.asset.tag, name: p.asset.name } : { id: p.asset_id },
    employee: p.employee ? { id: p.employee.id, name: p.employee.name } : { id: p.employee_id },
    delivered_at: p.delivered_at,
    delivered_by: p.deliveredByUser ? { id: p.deliveredByUser.id, name: p.deliveredByUser.name } : p.delivered_by,
    condition_on_delivery: p.condition_on_delivery,
    accessories: p.accessories,
    acceptance_type: p.acceptance_type,
    signed_document_path: p.signed_document_path,
    returned_at: p.returned_at,
    received_by: p.receivedByUser ? { id: p.receivedByUser.id, name: p.receivedByUser.name } : p.received_by,
    condition_on_return: p.condition_on_return,
    return_notes: p.return_notes,
    lost_justification: p.lost_justification,
    related_ticket_id: p.related_ticket_id,
    related_maintenance_order_id: p.related_maintenance_order_id,
    status: p.status,
    createdAt: p.createdAt,
  };
}
