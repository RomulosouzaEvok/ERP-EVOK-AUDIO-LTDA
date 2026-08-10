import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Leva o pedido de `pending` ate `sent`.
 *
 * A aprovacao usa `approverToken()` (segundo administrador) porque a
 * segregacao de funcao (D-K, 2026-08-10) recusa que o autor do pedido o
 * aprove. `sent` nao e ponto de aprovacao e continua com o mesmo usuario.
 *
 * @param purchaseId - Id do pedido de compra.
 * @returns Promise resolvida quando o pedido esta `sent`.
 */
async function aprovarEEnviar(purchaseId: number): Promise<void> {
  await api()
    .put(`/api/purchases/${purchaseId}/status`)
    .set('Authorization', `Bearer ${approverToken()}`)
    .send({ status: 'approved' })
    .expect(200);
  await api()
    .put(`/api/purchases/${purchaseId}/status`)
    .set('Authorization', `Bearer ${authToken()}`)
    .send({ status: 'sent' })
    .expect(200);
}

describeIntegration('Deduplicacao de NF no recebimento de compra', () => {
  /**
   * Achado real de auditoria: nada impedia a mesma NF do fornecedor de ser
   * lancada duas vezes contra o mesmo pedido (cada lancamento dentro do
   * saldo pendente era aceito, gerando duplicidade real de estoque). Agora
   * `invoice_number` e obrigatorio e tem constraint unica por pedido.
   *
   * @returns Promise resolvida apos validar a rejeicao da segunda NF.
   */
  it('rejeita registrar a mesma NF duas vezes contra o mesmo pedido', async () => {
    const token = authToken();
    const supplierId = Number(process.env.TEST_SUPPLIER_ID);
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const created = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplier_id: supplierId, items: [{ product_id: productId, quantity: 10, unit_price: 10 }] });
    expect(created.status).toBe(201);

    const purchaseId = created.body.data.id;
    const itemId = created.body.data.items[0].id;

    await aprovarEEnviar(purchaseId);

    const invoiceNumber = `NF-DUP-${Date.now()}`;

    const first = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ item_id: itemId, quantity: 4 }], invoice_number: invoiceNumber });
    expect(first.status).toBe(200);

    // Mesma NF, quantidade dentro do saldo pendente (6 restantes) — deve
    // ser rejeitada MESMO estando dentro do limite de quantidade, porque a
    // NF ja foi registrada.
    const duplicate = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ item_id: itemId, quantity: 4 }], invoice_number: invoiceNumber });
    expect(duplicate.status).toBe(409);

    // NF diferente, mesmo pedido — deve ser aceita normalmente.
    const differentInvoice = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ item_id: itemId, quantity: 4 }], invoice_number: `${invoiceNumber}-B` });
    expect(differentInvoice.status).toBe(200);
  });

  /** @returns Promise resolvida apos validar 400 sem invoice_number. */
  it('rejeita recebimento sem invoice_number', async () => {
    const token = authToken();
    const supplierId = Number(process.env.TEST_SUPPLIER_ID);
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const created = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplier_id: supplierId, items: [{ product_id: productId, quantity: 5, unit_price: 10 }] });
    const purchaseId = created.body.data.id;
    const itemId = created.body.data.items[0].id;

    await aprovarEEnviar(purchaseId);

    const response = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ item_id: itemId, quantity: 5 }] });
    expect(response.status).toBe(400);
  });
});
