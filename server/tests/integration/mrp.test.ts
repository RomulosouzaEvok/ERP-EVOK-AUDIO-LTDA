/**
 * Teste de integracao para o fluxo MRP.
 *
 * @module tests/integration/mrp.test
 */

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('MRP Integration Tests', () => {
  it('POST /api/mrp/plan - deve gerar ordens planejadas', async () => {
    const token = authToken();

    const response = await api()
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        demands: [
          {
            item_id: '00000000-0000-0000-0000-000000000001',
            quantidade: 10,
            data_necessidade: '2026-08-15',
            origem: 'MANUAL',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
