/**
 * Caso de uso: atualização de evento/feira de marketing, cobrindo o fluxo
 * do endpoint `PUT /api/marketing/events/:id`.
 *
 * Imutabilidade pós-conclusão: `docs/business/BLOCO_5_MKT_API.md` §6.1
 * descreve "mesma disciplina de campanha, exceto notes" — mas
 * `marketing_events` (migration `20260807-000313`) NÃO tem coluna `notes`
 * (só `marketing_campaigns` ganhou esse campo na migration `000314`).
 * Decisão de implementação (registrada aqui por não haver coluna que
 * sustente a exceção): quando `status` atual é `completed`/`canceled`,
 * NENHUM campo é editável via este endpoint — use `POST /events/:id/close`
 * apenas para o fechamento em si; correções pós-fechamento exigiriam uma
 * migration aditiva (`notes`) em uma rodada futura.
 *
 * @module modules/marketing/application/use-cases/event/UpdateEventUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import EventRepository from '../../../domain/repositories/EventRepository';

const IMMUTABLE_STATUSES = ['completed', 'canceled'];

type UpdateEventInput = { id: number } & Record<string, any>;

class UpdateEventUseCase extends UseCase<UpdateEventInput, any> {
  private readonly eventRepository: EventRepository;

  constructor(eventRepository: EventRepository) {
    super();
    this.eventRepository = eventRepository;
  }

  /**
   * @throws {NotFoundError} Se o evento não existir.
   * @throws {ValidationError} Se `end_date` vier antes de `start_date`.
   * @throws {BusinessRuleError} Se o evento estiver `completed`/`canceled`.
   */
  async execute({ id, ...rest }: UpdateEventInput) {
    const current = await this.eventRepository.findEventById(id);
    if (!current) {
      throw new NotFoundError('Evento não encontrado.');
    }

    if (IMMUTABLE_STATUSES.includes(current.status) && Object.keys(rest).length > 0) {
      throw new BusinessRuleError(`Evento '${current.status}' não pode mais ser editado.`);
    }

    const startDate = rest.start_date ?? current.start_date;
    const endDate = rest.end_date !== undefined ? rest.end_date : current.end_date;
    if (endDate && new Date(endDate) < new Date(startDate)) {
      throw new ValidationError('end_date não pode ser anterior a start_date.');
    }

    return this.eventRepository.updateEvent(id, rest);
  }
}

export = UpdateEventUseCase;
