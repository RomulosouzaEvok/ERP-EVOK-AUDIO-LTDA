/**
 * Regressao HTTP para ids invalidos em rotas de lote.
 *
 * O id deve ser recusado na borda do controller com 400, antes de chegar ao
 * Sequelize. Antes, `/api/inventory/lots/:id/release` podia propagar id textual
 * ate o banco e voltar 500.
 *
 * @module tests/integration/inventory-lot-id-validation
 */

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Inventory lot route id validation', () => {
  it('POST /api/inventory/lots/:id/release rejeita id nao numerico com 400', async () => {
    const response = await api()
      .post('/api/inventory/lots/not-a-number/release')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ notes: 'nao deve tocar o banco' });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
  });

  it('POST /api/inventory/lots/:id/block rejeita id nao numerico com 400', async () => {
    const response = await api()
      .post('/api/inventory/lots/not-a-number/block')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ reason: 'nao deve tocar o banco' });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
  });
});
