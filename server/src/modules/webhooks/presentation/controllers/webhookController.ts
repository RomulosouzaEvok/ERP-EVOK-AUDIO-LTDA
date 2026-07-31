const ProcessN8nWebhookUseCase = require('../../application/use-cases/ProcessN8nWebhookUseCase');

/**
 * Controller enxuto do módulo `webhooks`. Mantém o mesmo contrato JSON e o
 * mesmo endpoint do handler anterior (`server/src/routes/webhooks.ts`),
 * apenas delegando a validação ao use case da camada de aplicação. Não há
 * autenticação de usuário — é um webhook de sistema externo (n8n).
 */

/** `POST /api/webhooks/n8n` — recebe eventos do n8n. */
exports.n8n = async (req, res) => {
  const useCase = new ProcessN8nWebhookUseCase();
  try {
    const signature = req.header('X-Evok-Signature');
    const result = await useCase.execute({ signature, body: req.body });
    res.status(202).json({ success: true, accepted: result.accepted, event: result.event });
  } catch (error: any) {
    if (error?.message === 'MISSING_SIGNATURE') {
      res.status(400).json({ success: false, error: 'Assinatura ausente' });
      return;
    }
    res.status(500).json({ success: false, error: 'Erro ao processar webhook' });
  }
};
