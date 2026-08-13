'use strict';

const { openDatabase, createCompany } = require('../src/db');
const { createSupplierService } = require('../src/supplierService');
const { createApprovalService } = require('../src/approvalService');
const { createPaymentService } = require('../src/paymentService');
const { createGatewayClient } = require('../src/gatewayClient');

/**
 * Monta um contexto isolado (banco em memória + serviços) para cada teste.
 */
function buildContext() {
  const db = openDatabase(':memory:');
  const gateway = createGatewayClient();

  const acme = createCompany(db, 'ACME Indústria');
  const globex = createCompany(db, 'Globex Comércio');

  return {
    db,
    gateway,
    companies: { acme: acme.id, globex: globex.id },
    suppliers: createSupplierService(db),
    approvals: createApprovalService(db),
    payments: createPaymentService({ db, gateway }),
    close() {
      db.close();
    }
  };
}

function user({ id = 'u1', role = 'analyst', companyId }) {
  return { id, role, companyId };
}

module.exports = { buildContext, user };
