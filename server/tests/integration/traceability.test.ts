/**
 * Teste de integracao para o fluxo de rastreabilidade.
 *
 * @module tests/integration/traceability.test
 */

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Traceability Integration Tests', () => {
  it('GET /api/traceability/items/:id - id invalido deve retornar 400', async () => {
    const token = authToken();

    const response = await api()
      .get('/api/traceability/items/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
  });
});
