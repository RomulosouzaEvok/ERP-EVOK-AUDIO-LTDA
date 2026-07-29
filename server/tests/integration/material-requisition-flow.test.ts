import { api, authToken, integrationEnabled } from '../helpers/testApi';

const describeIntegration = integrationEnabled() ? describe : describe.skip;

describeIntegration('Fluxo Engenharia -> Compras -> Aprovacao', () => {
  /**
   * Executa o fluxo minimo de requisicao de materiais via API.
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('cria pedido de compra, aprova e mantem rastreabilidade', async () => {
    const token = authToken();

    const created = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplier_id: Number(process.env.TEST_SUPPLIER_ID),
        items: [{ product_id: Number(process.env.TEST_PRODUCT_ID), quantity: 2.5, unit_price: 10.75 }],
        notes: 'Teste automatizado: requisicao originada pela engenharia',
      })
      .expect((response) => expect([200, 201]).toContain(response.status));

    const purchaseId = created.body?.data?.id ?? created.body?.id;
    expect(purchaseId).toBeTruthy();

    await api()
      .put(`/api/purchases/${purchaseId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' })
      .expect((response) => expect([200, 204]).toContain(response.status));
  });
});
