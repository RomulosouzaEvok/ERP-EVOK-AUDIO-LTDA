/**
 * Use case: reenvio manual de um evento eSocial `rejeitado` (RF-SST-043 A1).
 *
 * Idempotência (E2/UC-47): cria uma NOVA linha `pendente` para a mesma
 * origem (o índice único parcial `uq_sst_eventos_esocial_origem_ativo`
 * garante no banco que só existirá 1 evento ativo por origem) — o evento
 * rejeitado permanece no histórico, nunca é sobrescrito.
 *
 * @module modules/sst/application/use-cases/esocial/ResendEsocialEventUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';
import { NotFoundError, ValidationError, ConflictError } from '../../../../../errors';

class ResendEsocialEventUseCase extends UseCase<{ id: string | number }, any> {
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(esocialEventRepository: EsocialEventRepository) {
    super();
    this.esocialEventRepository = esocialEventRepository;
  }

  /**
   * @throws {NotFoundError} Se o evento não existir (404).
   * @throws {ValidationError} Se o evento não estiver `rejeitado` (400).
   * @throws {ConflictError} Se já existir um evento ativo (não-rejeitado) para a mesma origem (409 — corrida rara, o índice único do banco garante a invariante).
   */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const evento = await this.esocialEventRepository.findById(id);
    if (!evento) throw new NotFoundError('Evento eSocial não encontrado.');
    if (evento.status !== 'rejeitado') {
      throw new ValidationError('Só é possível reenviar eventos com status "rejeitado".');
    }

    const jaAtivo = await this.esocialEventRepository.findActiveByOrigin(evento.origem_tipo, evento.origem_id);
    if (jaAtivo) {
      throw new ConflictError('Já existe um evento ativo (não rejeitado) para esta origem — reenvio não duplicado.');
    }

    const novo = await this.esocialEventRepository.create({
      tipo: evento.tipo,
      origem_tipo: evento.origem_tipo,
      origem_id: evento.origem_id,
      payload_referencia: evento.payload_referencia,
      prazo_legal: evento.prazo_legal,
      status: 'pendente'
    });

    return { id: novo.id, tipo: novo.tipo, entidade_origem: { tipo: novo.origem_tipo, id: novo.origem_id }, status: novo.status };
  }
}

export = ResendEsocialEventUseCase;
