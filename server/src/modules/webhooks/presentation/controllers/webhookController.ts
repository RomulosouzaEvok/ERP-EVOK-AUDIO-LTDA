const ProcessN8nWebhookUseCase = require('../../application/use-cases/ProcessN8nWebhookUseCase');
const HandleNfeStatusWebhookUseCase = require('../../../fiscal/application/use-cases/HandleNfeStatusWebhookUseCase');

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

/**
 * `POST /api/webhooks/focus-nfe` — notificação assíncrona de mudança de
 * status de NF-e. Protegido por segredo compartilhado no header (não por
 * HMAC, pois a Focus NFe não assina o corpo por padrão); o payload
 * recebido é usado APENAS para extrair a referência — o status real é
 * sempre reconsultado diretamente na API (nunca aplicado do payload).
 */
exports.focusNfeStatusChange = async (req, res) => {
  const secret = process.env.FOCUS_NFE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, error: 'Webhook não configurado' });
    return;
  }
  if (req.header('X-Webhook-Secret') !== secret) {
    res.status(401).json({ success: false, error: 'Segredo inválido' });
    return;
  }

  try {
    const ref = req.body?.ref || req.body?.referencia || req.query.ref;
    const useCase = new HandleNfeStatusWebhookUseCase();
    await useCase.execute({ ref });
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(error?.statusCode || 500).json({ success: false, error: error?.message || 'Erro ao processar webhook' });
  }
};
