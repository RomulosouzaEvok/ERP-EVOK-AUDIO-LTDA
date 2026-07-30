import { api, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Webhook IA/n8n', () => {
  /**
   * Valida contrato basico do webhook externo usado por automacoes.
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('responde com status de aceite para evento valido', async () => {
    const webhookPath = process.env.TEST_N8N_WEBHOOK_PATH || '/api/webhooks/n8n';

    await api()
      .post(webhookPath)
      .set('X-Evok-Signature', process.env.TEST_N8N_SIGNATURE || 'test-signature')
      .send({
        event: 'mrp.material.shortage',
        payload: {
          item_code: 'MP-FIO-COBRE',
          quantity: 0.125,
          unit: 'KG',
        },
      })
      .expect((response) => expect([200, 202]).toContain(response.status));
  });
});
