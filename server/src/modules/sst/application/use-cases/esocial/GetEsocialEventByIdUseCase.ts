/**
 * Use case: detalhe de um evento da fila eSocial SST.
 *
 * @module modules/sst/application/use-cases/esocial/GetEsocialEventByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';
import { NotFoundError } from '../../../../../errors';

class GetEsocialEventByIdUseCase extends UseCase<{ id: string | number }, any> {
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(esocialEventRepository: EsocialEventRepository) {
    super();
    this.esocialEventRepository = esocialEventRepository;
  }

  /** @throws {NotFoundError} Se não existir. */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const evento = await this.esocialEventRepository.findById(id);
    if (!evento) throw new NotFoundError('Evento eSocial não encontrado.');
    return {
      id: evento.id,
      tipo: evento.tipo,
      entidade_origem: { tipo: evento.origem_tipo, id: evento.origem_id },
      payload_referencia: evento.payload_referencia,
      prazo_legal: evento.prazo_legal,
      status: evento.status,
      recibo: evento.recibo,
      motivo_rejeicao: evento.motivo_rejeicao,
      data_envio: evento.data_envio
    };
  }
}

export = GetEsocialEventByIdUseCase;
