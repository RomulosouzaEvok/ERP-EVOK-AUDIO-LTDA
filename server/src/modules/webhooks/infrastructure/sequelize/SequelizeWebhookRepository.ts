/**
 * Implementacao Sequelize do repositorio de eventos de webhook.
 *
 * @module modules/webhooks/infrastructure/sequelize/SequelizeWebhookRepository
 */

import WebhookRepository from '../../domain/repositories/WebhookRepository';
const { WebhookEvent } = require('../../../../models/index');

class SequelizeWebhookRepository extends WebhookRepository {
  /** @inheritdoc */
  public async findOrCreateEvent(
    source: string,
    eventId: string,
    defaults: Record<string, unknown>,
  ): Promise<[any, boolean]> {
    return WebhookEvent.findOrCreate({
      where: { source, event_id: eventId },
      defaults,
    });
  }
}

export = SequelizeWebhookRepository;
