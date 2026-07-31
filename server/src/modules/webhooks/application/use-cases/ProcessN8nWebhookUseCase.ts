/**
 * Use case: processar o recebimento de um webhook do n8n.
 *
 * Este webhook é chamado por um sistema externo (n8n), sem autenticação de
 * usuário — apenas valida a presença do cabeçalho de assinatura
 * `X-Evok-Signature`, mesmo comportamento do handler anterior
 * (`server/src/routes/webhooks.ts`).
 *
 * @module modules/webhooks/application/use-cases/ProcessN8nWebhookUseCase
 */

import UseCase from '../../../../shared/application/UseCase';

interface ProcessN8nWebhookInput {
  signature?: string | null;
  body?: { event?: unknown } | null;
}

interface ProcessN8nWebhookOutput {
  accepted: boolean;
  event: unknown;
}

class ProcessN8nWebhookUseCase extends UseCase<ProcessN8nWebhookInput, ProcessN8nWebhookOutput> {
  /**
   * @param input - Assinatura recebida e corpo da requisição do webhook.
   * @returns Confirmação de aceite do evento.
   * @throws {Error} `MISSING_SIGNATURE` se a assinatura estiver ausente.
   */
  public async execute(input: ProcessN8nWebhookInput): Promise<ProcessN8nWebhookOutput> {
    const { signature, body } = input;
    if (!signature) {
      throw new Error('MISSING_SIGNATURE');
    }
    return { accepted: true, event: body?.event ?? null };
  }
}

export = ProcessN8nWebhookUseCase;
