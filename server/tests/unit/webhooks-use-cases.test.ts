import ProcessN8nWebhookUseCase = require('../../src/modules/webhooks/application/use-cases/ProcessN8nWebhookUseCase');

describe('Use cases de webhooks', () => {
  it('rejeita webhook sem assinatura', async () => {
    const useCase = new ProcessN8nWebhookUseCase();

    await expect(useCase.execute({ signature: undefined, body: { event: 'x' } })).rejects.toThrow(
      'MISSING_SIGNATURE'
    );
  });

  it('aceita webhook com assinatura e retorna o evento do corpo', async () => {
    const useCase = new ProcessN8nWebhookUseCase();

    const result = await useCase.execute({ signature: 'abc', body: { event: 'order.created' } });

    expect(result).toEqual({ accepted: true, event: 'order.created' });
  });
});
