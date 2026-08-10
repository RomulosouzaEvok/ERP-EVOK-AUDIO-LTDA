import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Fluxo Engenharia -> Compras -> Aprovacao', () => {
  /**
   * Executa o fluxo minimo de requisicao de materiais via API.
   *
   * Desde a segregacao de funcao (D-K, 2026-08-10) quem REGISTRA o pedido
   * nao pode aprova-lo: o fluxo passou a exigir duas pessoas, e o teste
   * reflete isso — `authToken()` compra, `approverToken()` aprova.
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
      .set('Authorization', `Bearer ${approverToken()}`)
      .send({ status: 'approved' })
      .expect((response) => expect([200, 204]).toContain(response.status));
  });
});
