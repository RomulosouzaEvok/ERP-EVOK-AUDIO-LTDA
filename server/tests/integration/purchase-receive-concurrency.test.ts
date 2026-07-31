import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import type { Response } from 'supertest';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Concorrencia de recebimento de compra', () => {
  /**
   * Cria um pedido de compra no estado `sent` com um item de quantidade
   * fixa, pronto para o teste de recebimento concorrente.
   *
   * @returns Id do pedido e id do item criado.
   */
  async function createSentPurchaseOrder(): Promise<{ purchaseId: number; itemId: number }> {
    const token = authToken();
    const supplierId = Number(process.env.TEST_SUPPLIER_ID);
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const createResponse = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplier_id: supplierId,
        items: [{ product_id: productId, quantity: 5, unit_price: 10 }],
      });

    if (createResponse.status !== 201) {
      throw new Error(`Falha ao criar pedido de compra fixture: ${JSON.stringify(createResponse.body)}`);
    }

    const purchaseId = createResponse.body.data.id;
    const itemId = createResponse.body.data.items[0].id;

    for (const status of ['approved', 'sent']) {
      const statusResponse = await api()
        .put(`/api/purchases/${purchaseId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });

      if (statusResponse.status !== 200) {
        throw new Error(`Falha ao mover pedido para ${status}: ${JSON.stringify(statusResponse.body)}`);
      }
    }

    return { purchaseId, itemId };
  }

  /**
   * Duas requisicoes simultaneas tentando receber a quantidade total (5) do
   * mesmo item de compra so podem resultar em um recebimento efetivo; a
   * segunda deve falhar por exceder o saldo pendente (lock pessimista no
   * pedido e nos itens).
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('impede recebimento duplicado que excederia a quantidade pedida', async () => {
    const token = authToken();
    const { purchaseId, itemId } = await createSentPurchaseOrder();

    // NFs diferentes: o objetivo deste teste e a concorrencia na baixa de
    // estoque/quantidade recebida do item, nao a deduplicacao de NF (essa
    // e coberta em purchase-receipt-duplicate-invoice.test.ts).
    const [first, second] = await Promise.allSettled([
      api().post(`/api/purchases/${purchaseId}/receive`).set('Authorization', `Bearer ${token}`).send({ items: [{ item_id: itemId, quantity: 5 }], invoice_number: `NF-CONC-A-${Date.now()}` }),
      api().post(`/api/purchases/${purchaseId}/receive`).set('Authorization', `Bearer ${token}`).send({ items: [{ item_id: itemId, quantity: 5 }], invoice_number: `NF-CONC-B-${Date.now()}` }),
    ]);

    const responses = [first, second]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value);

    const successCount = responses.filter((response) => response.status === 200).length;
    const failureCount = responses.filter((response) => [400, 409, 422].includes(response.status)).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);
  });
});
