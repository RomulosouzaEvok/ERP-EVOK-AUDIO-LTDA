'use strict';

const CNPJ_PATTERN = /^\d{14}$/;

/**
 * Serviço de cadastro e consulta de fornecedores.
 */
function createSupplierService(db) {
  /**
   * Cadastra um fornecedor com status inicial `pending`.
   */
  function createSupplier({ cnpj, name, companyId }) {
    if (typeof cnpj !== 'string' || !CNPJ_PATTERN.test(cnpj)) {
      throw new Error('CNPJ inválido: informe 14 dígitos');
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Nome do fornecedor é obrigatório');
    }
    if (!Number.isInteger(companyId)) {
      throw new Error('companyId é obrigatório');
    }

    const company = db.get('SELECT id FROM companies WHERE id = ?', companyId);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }

    const now = new Date().toISOString();
    const result = db.run(
      `INSERT INTO suppliers (company_id, cnpj, name, status, credit_limit, created_at)
       VALUES (?, ?, ?, 'pending', 0, ?)`,
      companyId,
      cnpj,
      name.trim(),
      now
    );

    return db.get('SELECT * FROM suppliers WHERE id = ?', Number(result.lastInsertRowid));
  }

  /**
   * Consulta um fornecedor da empresa do usuário.
   */
  function getSupplier({ supplierId, user }) {
    if (!user || !Number.isInteger(user.companyId)) {
      throw new Error('Usuário inválido');
    }

    const supplier = db.get(
      'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
      supplierId,
      user.companyId
    );

    if (!supplier) {
      throw new Error('Fornecedor não encontrado');
    }

    return supplier;
  }

  return { createSupplier, getSupplier };
}

module.exports = { createSupplierService };
