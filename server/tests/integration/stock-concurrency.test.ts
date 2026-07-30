import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import type { Response } from 'supertest';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Concorrencia de estoque', () => {
  /**
   * Simula duas baixas simultaneas para impedir estoque negativo.
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('bloqueia colisao transacional que geraria estoque negativo', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_LOW_STOCK_PRODUCT_ID);

    const payload = {
      product_id: productId,
      type: 'out',
      quantity: Number(process.env.TEST_LOW_STOCK_QUANTITY || 999999),
      description: 'Teste automatizado de concorrencia',
    };

    const [first, second] = await Promise.allSettled([
      api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload),
      api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload),
    ]);

    const statuses = [first, second]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value.status);

    expect(statuses.some((status) => [400, 409, 422].includes(status))).toBe(true);
  });
});
