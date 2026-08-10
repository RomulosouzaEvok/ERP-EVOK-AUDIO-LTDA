import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: rastreabilidade e audit-log com dados reais de lote', () => {
  /**
   * Regressao para dois bugs reais encontrados em ensaio de canario:
   * (1) `SequelizeTraceabilityRepository` incluia `Supplier` com
   * `attributes: ['id', 'name']`, mas a coluna real e `company_name` -
   * qualquer consulta de rastreabilidade de um item com lote recebido de
   * fornecedor derrubava com 500 ("column lot_controls->supplier.name does
   * not exist"). (2) `auditLogController.list` filtrava por `where.entity`,
   * coluna inexistente (`entity_type` e a coluna real) - qualquer consulta
   * de audit log com `entity_type` na query derrubava com 500. O teste
   * anterior de rastreabilidade so cobria o caminho de id invalido (400),
   * nunca um item com lote real, por isso o bug nao era pego.
   *
   * @returns Promise resolvida apos validar 200 em ambos os endpoints.
   */
  it('rastreabilidade de item com lote de fornecedor retorna 200 com dados do fornecedor', async () => {
    const token = authToken();
    const supplierId = Number(process.env.TEST_SUPPLIER_ID);
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const purchase = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplier_id: supplierId,
        items: [{ product_id: productId, quantity: 3, unit_price: 10 }],
      });

    expect(purchase.status).toBe(201);
    const purchaseId = purchase.body.data.id;

    // Segregacao de funcao (D-K, 2026-08-10): quem registrou o pedido nao o
    // aprova — a aprovacao sai do segundo administrador.
    const sent = await api()
      .put(`/api/purchases/${purchaseId}/status`)
      .set('Authorization', `Bearer ${approverToken()}`)
      .send({ status: 'approved' });
    expect(sent.status).toBe(200);

    const approvedToSent = await api()
      .put(`/api/purchases/${purchaseId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'sent' });
    expect(approvedToSent.status).toBe(200);

    const received = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ item_id: purchase.body.data.items[0].id, quantity: 3 }], invoice_number: `NF-TRACE-${Date.now()}` });
    expect(received.status).toBe(200);

    const traceability = await api()
      .get(`/api/traceability/items/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(traceability.status).toBe(200);
    expect(traceability.body.success).toBe(true);
  });

  /**
   * Regressao do filtro `entity_type` de `GET /api/audit-logs`.
   *
   * @returns Promise resolvida apos validar 200 com o filtro aplicado.
   */
  it('GET /api/audit-logs com filtro entity_type retorna 200', async () => {
    const token = authToken();

    const response = await api()
      .get('/api/audit-logs?entity_type=Sale')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
