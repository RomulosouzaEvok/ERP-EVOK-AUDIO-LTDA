import crypto from 'crypto';
import { api, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() && process.env.TEST_N8N_WEBHOOK_SECRET
  ? describe
  : describe.skip;

function sign(body: Record<string, unknown>) {
  const secret = process.env.TEST_N8N_WEBHOOK_SECRET as string;
  return crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
}

describeIntegration('Webhook IA/n8n', () => {
  const webhookPath = process.env.TEST_N8N_WEBHOOK_PATH || '/api/webhooks/n8n';

  /**
   * Valida contrato do webhook externo: assinatura HMAC correta e evento
   * com `event_id` sao aceitos.
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('aceita evento com assinatura HMAC valida e event_id', async () => {
    const body = {
      event: 'mrp.material.shortage',
      event_id: `evt-${Date.now()}`,
      payload: { item_code: 'MP-FIO-COBRE', quantity: 0.125, unit: 'KG' },
    };

    const response = await api()
      .post(webhookPath)
      .set('X-Evok-Signature', sign(body))
      .send(body);

    expect(response.status).toBe(202);
    expect(response.body.duplicate).toBe(false);
  });

  /**
   * Reentrega do MESMO event_id (comum em sistemas de fila/retry) deve
   * ser aceita mas marcada como duplicada, sem reprocessar.
   *
   * @returns Promise resolvida apos validar idempotencia.
   */
  it('detecta reentrega do mesmo event_id como duplicada', async () => {
    const body = {
      event: 'mrp.material.shortage',
      event_id: `evt-dup-${Date.now()}`,
      payload: { item_code: 'MP-FIO-COBRE', quantity: 0.125, unit: 'KG' },
    };

    const first = await api().post(webhookPath).set('X-Evok-Signature', sign(body)).send(body);
    expect(first.status).toBe(202);
    expect(first.body.duplicate).toBe(false);

    const second = await api().post(webhookPath).set('X-Evok-Signature', sign(body)).send(body);
    expect(second.status).toBe(202);
    expect(second.body.duplicate).toBe(true);
  });

  /**
   * Assinatura incorreta (nao corresponde ao HMAC do corpo) deve ser
   * rejeitada com 401, nunca aceita.
   *
   * @returns Promise resolvida apos validar rejeicao.
   */
  it('rejeita assinatura invalida', async () => {
    const body = { event: 'order.created', event_id: `evt-invalid-${Date.now()}` };

    const response = await api()
      .post(webhookPath)
      .set('X-Evok-Signature', 'assinatura-forjada-que-nao-bate')
      .send(body);

    expect(response.status).toBe(401);
  });
});
