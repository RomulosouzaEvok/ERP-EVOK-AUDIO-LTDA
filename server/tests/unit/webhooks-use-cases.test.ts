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
  const webhookRepository = {
    findOrCreateEvent: jest.fn(async (_source: string, _eventId: string, defaults: Record<string, unknown>) => [defaults, true]),
  };

  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = SECRET;
    webhookRepository.findOrCreateEvent.mockClear();
  });

  afterAll(() => {
    process.env.N8N_WEBHOOK_SECRET = originalSecret;
  });

  it('rejeita webhook sem assinatura', async () => {
    const useCase = new ProcessN8nWebhookUseCase(webhookRepository as any);

    await expect(useCase.execute({ signature: undefined, body: { event: 'x', event_id: '1' } })).rejects.toThrow(
      'MISSING_SIGNATURE'
    );
  });

  it('rejeita webhook sem N8N_WEBHOOK_SECRET configurado', async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    const useCase = new ProcessN8nWebhookUseCase(webhookRepository as any);

    await expect(
      useCase.execute({ signature: 'abc', body: { event: 'x', event_id: '1' } })
    ).rejects.toThrow('WEBHOOK_SECRET_NOT_CONFIGURED');
  });

  it('rejeita assinatura invalida (nao bate com o HMAC do corpo)', async () => {
    const useCase = new ProcessN8nWebhookUseCase(webhookRepository as any);
    const body = { event: 'order.created', event_id: 'evt-1' };
    const { rawBody } = sign(body);

    await expect(
      useCase.execute({ signature: 'assinatura-forjada-incorreta', rawBody, body })
    ).rejects.toThrow('INVALID_SIGNATURE');
  });

  it('rejeita payload sem event_id', async () => {
    const useCase = new ProcessN8nWebhookUseCase(webhookRepository as any);
    const body = { event: 'order.created' };
    const { rawBody, signature } = sign(body);

    await expect(useCase.execute({ signature, rawBody, body })).rejects.toThrow('MISSING_EVENT_ID');
  });

  it('aceita evento valido e delega a persistencia ao repositorio', async () => {
    const useCase = new ProcessN8nWebhookUseCase(webhookRepository as any);
    const body = { event: 'order.created', event_id: 'evt-2' };
    const { rawBody, signature } = sign(body);

    const result = await useCase.execute({ signature, rawBody, body });

    expect(webhookRepository.findOrCreateEvent).toHaveBeenCalledWith(
      'n8n',
      'evt-2',
      expect.objectContaining({ source: 'n8n', event_id: 'evt-2', event_type: 'order.created' })
    );
    expect(result.duplicate).toBe(false);
  });
});
