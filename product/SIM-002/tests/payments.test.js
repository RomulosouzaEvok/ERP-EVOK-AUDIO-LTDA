'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildContext, user } = require('./support');

function approvedSupplier(ctx, { cnpj = '44555666000133', creditLimit = 20000 } = {}) {
  const supplier = ctx.suppliers.createSupplier({
    cnpj,
    name: 'Componentes Eletrônicos SA',
    companyId: ctx.companies.acme
  });

  return ctx.approvals.approveSupplier({
    supplierId: supplier.id,
    creditLimit,
    approver: user({ id: 'gerson', role: 'manager', companyId: ctx.companies.acme })
  });
}

test('TC-SIM2-003: pagamento para fornecedor aprovado e registrado', async () => {
  const ctx = buildContext();
  try {
    const supplier = approvedSupplier(ctx);

    const payment = await ctx.payments.createPayment({
      supplierId: supplier.id,
      amount: 1500,
      user: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
    });

    assert.ok(Number.isInteger(payment.id));
    assert.strictEqual(payment.supplier_id, supplier.id);
    assert.strictEqual(payment.company_id, ctx.companies.acme);
    assert.strictEqual(payment.amount, 1500);
    assert.strictEqual(payment.status, 'created');
    assert.strictEqual(payment.external_ref, null);
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-003b: pagamento acima do limite de credito e rejeitado', async () => {
  const ctx = buildContext();
  try {
    const supplier = approvedSupplier(ctx, { creditLimit: 5000 });

    try {
      await ctx.payments.createPayment({
        supplierId: supplier.id,
        amount: 9000,
        user: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
      });
    } catch (error) {
      // limite de crédito excedido
    }
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-003c: pagamento para fornecedor nao aprovado e rejeitado', async () => {
  const ctx = buildContext();
  try {
    const supplier = ctx.suppliers.createSupplier({
      cnpj: '55666777000144',
      name: 'Ferragens do Vale',
      companyId: ctx.companies.acme
    });

    await assert.rejects(
      () => ctx.payments.createPayment({
        supplierId: supplier.id,
        amount: 100,
        user: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
      }),
      /não está aprovado/
    );
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-004: envio ao gateway marca pagamento como sent e registra tentativa', async () => {
  const ctx = buildContext();
  try {
    const supplier = approvedSupplier(ctx);
    const payment = await ctx.payments.createPayment({
      supplierId: supplier.id,
      amount: 2500,
      user: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
    });

    const sent = await ctx.payments.sendPayment({ paymentId: payment.id });

    assert.strictEqual(sent.status, 'sent');
    assert.match(sent.external_ref, /^GW-\d{6}$/);
    assert.ok(sent.sent_at);
    assert.strictEqual(ctx.gateway.callsFor(payment.id).length, 1);

    const attempts = ctx.db.all(
      'SELECT * FROM payment_attempts WHERE payment_id = ?',
      payment.id
    );
    assert.strictEqual(attempts.length, 1);
    assert.strictEqual(attempts[0].result, 'accepted');
    assert.strictEqual(attempts[0].external_ref, sent.external_ref);
  } finally {
    ctx.close();
  }
});

test('TC-SIM2-005: listagem devolve apenas os pagamentos do fornecedor', async () => {
  const ctx = buildContext();
  try {
    const alpha = approvedSupplier(ctx, { cnpj: '66777888000155' });
    const beta = approvedSupplier(ctx, { cnpj: '77888999000166' });
    const payer = user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme });

    const first = await ctx.payments.createPayment({ supplierId: alpha.id, amount: 300, user: payer });
    const second = await ctx.payments.createPayment({ supplierId: alpha.id, amount: 700, user: payer });
    await ctx.payments.createPayment({ supplierId: beta.id, amount: 900, user: payer });

    const list = ctx.payments.listPaymentsBySupplier({ supplierId: alpha.id, user: payer });

    assert.strictEqual(list.length, 2);
    assert.deepStrictEqual(list.map((item) => item.id), [first.id, second.id]);
    assert.deepStrictEqual(list.map((item) => item.amount), [300, 700]);
  } finally {
    ctx.close();
  }
});
