'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildContext, user } = require('./support');

function newSupplier(ctx, cnpj = '33444555000122') {
  return ctx.suppliers.createSupplier({
    cnpj,
    name: 'Insumos Brasil LTDA',
    companyId: ctx.companies.acme
  });
}

test('TC-SIM2-002: analista aprova fornecedor dentro da sua alcada', () => {
  const ctx = buildContext();
  try {
    const supplier = newSupplier(ctx);

    const approved = ctx.approvals.approveSupplier({
      supplierId: supplier.id,
      creditLimit: 8000,
      approver: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
    });

    assert.strictEqual(approved.status, 'approved');
    assert.strictEqual(approved.credit_limit, 8000);
    assert.strictEqual(approved.approved_by, 'ana');
    assert.ok(approved.approved_at);
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-002b: aprovacao de analista acima da alcada e recusada', () => {
  const ctx = buildContext();
  try {
    const supplier = newSupplier(ctx);

    assert.throws(
      () => ctx.approvals.approveSupplier({
        supplierId: supplier.id,
        creditLimit: 200000,
        approver: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
      }),
      /alçada do analista/
    );

    const unchanged = ctx.suppliers.getSupplier({
      supplierId: supplier.id,
      user: user({ companyId: ctx.companies.acme })
    });
    assert.strictEqual(unchanged.status, 'pending');
    assert.strictEqual(unchanged.credit_limit, 0);
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-002c: gerente aprova fornecedor com limite elevado', () => {
  const ctx = buildContext();
  try {
    const supplier = newSupplier(ctx);

    const approved = ctx.approvals.approveSupplier({
      supplierId: supplier.id,
      creditLimit: 250000,
      approver: user({ id: 'gerson', role: 'manager', companyId: ctx.companies.acme })
    });

    assert.strictEqual(approved.status, 'approved');
    assert.strictEqual(approved.credit_limit, 250000);
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-002d: aprovador de outra empresa nao enxerga o fornecedor', () => {
  const ctx = buildContext();
  try {
    const supplier = newSupplier(ctx);

    assert.throws(
      () => ctx.approvals.approveSupplier({
        supplierId: supplier.id,
        creditLimit: 5000,
        approver: user({ id: 'ext', role: 'manager', companyId: ctx.companies.globex })
      }),
      /Fornecedor não encontrado/
    );
  } finally {
    ctx.close();
  }
});
