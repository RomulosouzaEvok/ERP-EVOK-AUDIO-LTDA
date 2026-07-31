import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import type { Response } from 'supertest';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Concorrencia de status de ordem de producao', () => {
  /**
   * Cria uma ordem de producao no estado inicial `planned` para o teste
   * de concorrencia de cancelamento.
   *
   * @returns Id da ordem de producao criada.
   */
  async function createPlannedProductionOrder(): Promise<number> {
    const token = authToken();
    const productId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const response = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 1, due_date: dueDate });

    if (response.status !== 201) {
      throw new Error(`Falha ao criar OP fixture: ${JSON.stringify(response.body)}`);
    }

    return response.body.data.id;
  }

  /**
   * Duas requisicoes simultaneas cancelando a mesma OP `planned` so podem
   * resultar em uma transicao efetiva; a segunda deve falhar por transicao
   * de status invalida (lock pessimista no registro principal).
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('impede dupla transicao de cancelamento em concorrencia', async () => {
    const token = authToken();
    const orderId = await createPlannedProductionOrder();

    const [first, second] = await Promise.allSettled([
      api().put(`/api/production-orders/${orderId}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'canceled' }),
      api().put(`/api/production-orders/${orderId}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'canceled' }),
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
