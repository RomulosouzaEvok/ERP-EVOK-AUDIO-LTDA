/**
 * Contrato do repositorio de eventos de webhook (idempotencia).
 *
 * @module modules/webhooks/domain/repositories/WebhookRepository
 */

class WebhookRepository {
  /**
   * Busca (ou cria, se nao existir) o registro de idempotencia de um
   * evento de webhook, identificado pelo par unico `source` + `event_id`.
   *
   * @abstract
   * @param source - Origem do evento (ex.: `'n8n'`).
   * @param eventId - Identificador do evento na origem.
   * @param defaults - Campos usados apenas na criacao, se o registro nao existir.
   * @returns Tupla `[registro, created]`, onde `created` indica se foi criado agora (`false` = reentrega).
   */
  public async findOrCreateEvent(
    _source: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _eventId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _defaults: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<[any, boolean]> {
    throw new Error('WebhookRepository.findOrCreateEvent nao implementado.');
  }
}

export = WebhookRepository;
