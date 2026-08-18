import { randomUUID } from 'crypto';
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

    // operation_id DISTINTOS de propósito: este teste isola concorrência
    // (duas requisições simultâneas competindo pelo mesmo saldo), não
    // idempotência (FIND-ERP-001, GRUPO B, CASE-001) — usar a mesma chave
    // aqui trocaria o que está sendo provado (rejeição por saldo insuficiente
    // sob lock vs. rejeição por replay de operation_id).
    const payloadA = {
      product_id: productId,
      operation_id: randomUUID(),
      type: 'out',
      quantity: Number(process.env.TEST_LOW_STOCK_QUANTITY || 999999),
      description: 'Teste automatizado de concorrencia',
    };
    const payloadB = {
      product_id: productId,
      operation_id: randomUUID(),
      type: 'out',
      quantity: Number(process.env.TEST_LOW_STOCK_QUANTITY || 999999),
      description: 'Teste automatizado de concorrencia',
    };

    const [first, second] = await Promise.allSettled([
      api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payloadA),
      api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payloadB),
    ]);

    const statuses = [first, second]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value.status);

    expect(statuses.some((status) => [400, 409, 422].includes(status))).toBe(true);
  });
});
