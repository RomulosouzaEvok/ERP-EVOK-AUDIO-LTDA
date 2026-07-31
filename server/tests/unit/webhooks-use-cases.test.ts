import crypto from 'crypto';
import ProcessN8nWebhookUseCase = require('../../src/modules/webhooks/application/use-cases/ProcessN8nWebhookUseCase');

const SECRET = 'test-n8n-secret-for-unit-tests';

function sign(body: Record<string, unknown>) {
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  return { rawBody, signature };
}

describe('Use cases de webhooks', () => {
  const originalSecret = process.env.N8N_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = SECRET;
  });

  afterAll(() => {
    process.env.N8N_WEBHOOK_SECRET = originalSecret;
  });

  it('rejeita webhook sem assinatura', async () => {
    const useCase = new ProcessN8nWebhookUseCase();

    await expect(useCase.execute({ signature: undefined, body: { event: 'x', event_id: '1' } })).rejects.toThrow(
      'MISSING_SIGNATURE'
    );
  });

  it('rejeita webhook sem N8N_WEBHOOK_SECRET configurado', async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    const useCase = new ProcessN8nWebhookUseCase();

    await expect(
      useCase.execute({ signature: 'abc', body: { event: 'x', event_id: '1' } })
    ).rejects.toThrow('WEBHOOK_SECRET_NOT_CONFIGURED');
  });

  it('rejeita assinatura invalida (nao bate com o HMAC do corpo)', async () => {
    const useCase = new ProcessN8nWebhookUseCase();
    const body = { event: 'order.created', event_id: 'evt-1' };
    const { rawBody } = sign(body);

    await expect(
      useCase.execute({ signature: 'assinatura-forjada-incorreta', rawBody, body })
    ).rejects.toThrow('INVALID_SIGNATURE');
  });

  it('rejeita payload sem event_id', async () => {
    const useCase = new ProcessN8nWebhookUseCase();
    const body = { event: 'order.created' };
    const { rawBody, signature } = sign(body);

    await expect(useCase.execute({ signature, rawBody, body })).rejects.toThrow('MISSING_EVENT_ID');
  });
});
