'use strict';

const PAYER_ROLES = ['analyst', 'manager'];

/**
 * Serviço de pagamentos a fornecedores.
 */
function createPaymentService({ db, gateway }) {
  async function loadApprovedSupplier(supplierId, user) {
    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      user.companyId
    );

    if (!supplier) {
      throw new Error('Fornecedor não encontrado');
    }
    if (supplier.status !== 'approved') {
      throw new Error('Fornecedor não está aprovado para receber pagamentos');
    }

    return supplier;
  }

  async function sumCommittedAmount(supplierId) {
    const row = db.get(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM payments
        WHERE supplier_id = ?
          AND status <> 'cancelled'`,
      supplierId
    );
    return row.total;
  }

  /**
   * Registra um pagamento para um fornecedor aprovado.
   */
  async function createPayment({ supplierId, amount, user }) {
    if (!user || !Number.isInteger(user.companyId) || !PAYER_ROLES.includes(user.role)) {
      throw new Error('Usuário não possui permissão para registrar pagamentos');
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Valor do pagamento deve ser positivo');
    }

    const supplier = await loadApprovedSupplier(supplierId, user);
    const committed = await sumCommittedAmount(supplierId);

    if (committed + amount > supplier.credit_limit) {
      throw new Error('Pagamento excede o limite de crédito do fornecedor');
    }

    const now = new Date().toISOString();
    const result = db.run(
      `INSERT INTO payments (supplier_id, company_id, amount, status, created_by, created_at)
       VALUES (?, ?, ?, 'created', ?, ?)`,
      supplierId,
      supplier.company_id,
      amount,
      String(user.id),
      now
    );

    return db.get('SELECT * FROM payments WHERE id = ?', Number(result.lastInsertRowid));
  }

  /**
   * Envia um pagamento registrado ao gateway externo.
   */
  async function sendPayment({ paymentId }) {
    const payment = db.get('SELECT * FROM payments WHERE id = ?', paymentId);

    if (!payment) {
      throw new Error('Pagamento não encontrado');
    }
    if (payment.status === 'cancelled') {
      throw new Error('Pagamento cancelado não pode ser enviado');
    }

    const now = new Date().toISOString();
    const response = await gateway.submitPayment({
      paymentId: payment.id,
      amount: payment.amount
    });

    db.run(
      `INSERT INTO payment_attempts (payment_id, external_ref, result, attempted_at)
       VALUES (?, ?, ?, ?)`,
      payment.id,
      response.externalRef,
      response.accepted ? 'accepted' : 'failed',
      now
    );

    db.run(
      `UPDATE payments SET status = 'sent', external_ref = ?, sent_at = ? WHERE id = ?`,
      response.externalRef,
      now,
      payment.id
    );

    return db.get('SELECT * FROM payments WHERE id = ?', payment.id);
  }

  /**
   * Lista os pagamentos de um fornecedor.
   */
  function listPaymentsBySupplier({ supplierId, user }) {
    if (!user || !Number.isInteger(user.companyId)) {
      throw new Error('Usuário inválido');
    }

    return db.all(
      `SELECT * FROM payments WHERE supplier_id = ? ORDER BY created_at, id`,
      supplierId
    );
  }

  /**
   * Cancela um pagamento.
   */
  function cancelPayment({ paymentId }) {
    const payment = db.get('SELECT * FROM payments WHERE id = ?', paymentId);

    if (!payment) {
      throw new Error('Pagamento não encontrado');
    }

    if (payment.status === 'sent') {
      db.run(`UPDATE payments SET status = 'created', sent_at = NULL WHERE id = ?`, payment.id);
    } else {
      db.run(`UPDATE payments SET status = 'cancelled' WHERE id = ?`, payment.id);
    }

    return db.get('SELECT * FROM payments WHERE id = ?', payment.id);
  }

  return { createPayment, sendPayment, listPaymentsBySupplier, cancelPayment };
}

module.exports = { createPaymentService };
