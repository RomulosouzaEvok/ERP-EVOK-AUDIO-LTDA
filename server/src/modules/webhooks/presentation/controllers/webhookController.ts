const ProcessN8nWebhookUseCase = require('../../application/use-cases/ProcessN8nWebhookUseCase');

/**
 * Controller enxuto do módulo `webhooks`. Delega a verificação de
 * assinatura HMAC e a idempotência do evento ao use case da camada de
 * aplicação. Não há autenticação de usuário — é um webhook de sistema
 * externo (n8n), protegido por assinatura criptográfica.
 */

/** `POST /api/webhooks/n8n` — recebe eventos do n8n. */
exports.n8n = async (req, res) => {
  const useCase = new ProcessN8nWebhookUseCase();
  try {
    const signature = req.header('X-Evok-Signature');
    const result = await useCase.execute({ signature, rawBody: req.rawBody, body: req.body });
    res.status(202).json({ success: true, accepted: result.accepted, event: result.event, duplicate: result.duplicate });
  } catch (error: any) {
    if (error?.message === 'MISSING_SIGNATURE') {
      res.status(400).json({ success: false, error: 'Assinatura ausente' });
      return;
    }
    if (error?.message === 'INVALID_SIGNATURE') {
      res.status(401).json({ success: false, error: 'Assinatura inválida' });
      return;
    }
    if (error?.message === 'MISSING_EVENT_ID') {
      res.status(400).json({ success: false, error: 'Payload sem event_id' });
      return;
    }
    if (error?.message === 'WEBHOOK_SECRET_NOT_CONFIGURED') {
      res.status(503).json({ success: false, error: 'Webhook não configurado' });
      return;
    }
    res.status(500).json({ success: false, error: 'Erro ao processar webhook' });
  }
};
