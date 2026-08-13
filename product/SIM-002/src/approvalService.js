'use strict';

const ANALYST_APPROVAL_LIMIT = 50000;
const APPROVER_ROLES = ['analyst', 'manager'];

/**
 * Serviço de aprovação de fornecedores com controle de alçada.
 */
function createApprovalService(db) {
  /**
   * Aprova um fornecedor concedendo-lhe um limite de crédito.
   */
  function approveSupplier({ supplierId, creditLimit, approver }) {
    if (!approver || !APPROVER_ROLES.includes(approver.role)) {
      throw new Error('Papel do aprovador não possui permissão de aprovação');
    }
    if (!Number.isInteger(approver.companyId)) {
      throw new Error('Aprovador inválido');
    }
    if (typeof creditLimit !== 'number' || !Number.isFinite(creditLimit) || creditLimit <= 0) {
      throw new Error('Limite de crédito deve ser um valor positivo');
    }

    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      approver.companyId
    );

    if (!supplier) {
      throw new Error('Fornecedor não encontrado');
    }
    if (supplier.status === 'approved') {
      throw new Error('Fornecedor já está aprovado');
    }

    if (approver.role === 'analyst' && creditLimit > ANALYST_APPROVAL_LIMIT) {
      throw new Error('Limite de crédito acima da alçada do analista: requer gerente');
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE suppliers
          SET status = 'approved', credit_limit = ?, approved_by = ?, approved_at = ?
        WHERE id = ?`,
      creditLimit,
      approver.id,
      now,
      supplierId
    );

    return db.get('SELECT * FROM suppliers WHERE id = ?', supplierId);
  }

  return { approveSupplier };
}

module.exports = { createApprovalService, ANALYST_APPROVAL_LIMIT };
