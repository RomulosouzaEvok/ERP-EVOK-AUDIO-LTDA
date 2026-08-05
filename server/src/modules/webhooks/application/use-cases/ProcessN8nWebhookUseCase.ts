/**
 * Use case: processar o recebimento de um webhook do n8n.
 *
 * Este webhook é chamado por um sistema externo (n8n), sem autenticação de
 * usuário — a proteção é criptográfica: valida a assinatura HMAC-SHA256 do
 * corpo bruto da requisição contra `N8N_WEBHOOK_SECRET` (comparação em
 * tempo constante), e garante idempotência via par único
 * `source` + `event_id` em `WebhookEvent` — uma reentrega do mesmo evento
 * (comum em sistemas de fila/retry como o n8n) é aceita sem reprocessar.
 *
 * @module modules/webhooks/application/use-cases/ProcessN8nWebhookUseCase
 */

import crypto from 'crypto';
import UseCase from '../../../../shared/application/UseCase';
import WebhookRepository from '../../domain/repositories/WebhookRepository';

interface ProcessN8nWebhookInput {
  signature?: string | null;
  rawBody?: Buffer | null;
  body?: { event?: string; event_id?: string | number; [key: string]: unknown } | null;
}

interface ProcessN8nWebhookOutput {
  accepted: boolean;
  event: unknown;
  duplicate: boolean;
}

class ProcessN8nWebhookUseCase extends UseCase<ProcessN8nWebhookInput, ProcessN8nWebhookOutput> {
  private readonly webhookRepository: WebhookRepository;

  /** @param webhookRepository - Repositorio de eventos de webhook. */
  public constructor(webhookRepository: WebhookRepository) {
    super();
    this.webhookRepository = webhookRepository;
  }

  /**
   * @param input - Assinatura, corpo bruto e corpo parseado da requisição.
   * @returns Confirmação de aceite do evento (`duplicate: true` se já processado antes).
   * @throws {Error} `MISSING_SIGNATURE` se a assinatura estiver ausente.
   * @throws {Error} `INVALID_SIGNATURE` se a assinatura não bater com o HMAC calculado.
   * @throws {Error} `MISSING_EVENT_ID` se o payload não trouxer um identificador de evento.
   */
  public async execute(input: ProcessN8nWebhookInput): Promise<ProcessN8nWebhookOutput> {
    const { signature, rawBody, body } = input;

    if (!signature) {
      throw new Error('MISSING_SIGNATURE');
    }

    const secret = process.env.N8N_WEBHOOK_SECRET;
    if (!secret) {
      // Sem segredo configurado, nao ha como validar a assinatura com
      // seguranca — falha fechada (nunca aceita "qualquer assinatura").
      throw new Error('WEBHOOK_SECRET_NOT_CONFIGURED');
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody ?? Buffer.from('')).digest('hex');
    const provided = Buffer.from(String(signature));
    const expectedBuf = Buffer.from(expected);
    const validSignature = provided.length === expectedBuf.length && crypto.timingSafeEqual(provided, expectedBuf);
    if (!validSignature) {
      throw new Error('INVALID_SIGNATURE');
    }

    const eventId = body?.event_id !== undefined && body?.event_id !== null ? String(body.event_id) : null;
    if (!eventId) {
      throw new Error('MISSING_EVENT_ID');
    }

    const [record, created] = await this.webhookRepository.findOrCreateEvent('n8n', eventId, {
      source: 'n8n',
      event_id: eventId,
      event_type: typeof body?.event === 'string' ? body.event : null,
      payload: body ?? null,
      received_at: new Date(),
    });

    return { accepted: true, event: record.event_type, duplicate: !created };
  }
}

export = ProcessN8nWebhookUseCase;
