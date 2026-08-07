/**
 * Use case: listar a fila de eventos eSocial SST (S-2210/S-2220/S-2240).
 *
 * @module modules/sst/application/use-cases/esocial/ListEsocialEventsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';

function toDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    tipo: plain.tipo,
    entidade_origem: { tipo: plain.origem_tipo, id: plain.origem_id },
    prazo_legal: plain.prazo_legal,
    status: plain.status,
    recibo: plain.recibo,
    motivo_rejeicao: plain.motivo_rejeicao,
    data_envio: plain.data_envio
  };
}

class ListEsocialEventsUseCase extends UseCase<Record<string, any>, any> {
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(esocialEventRepository: EsocialEventRepository) {
    super();
    this.esocialEventRepository = esocialEventRepository;
  }

  /** @param input - Filtros (`tipo`, `status`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.esocialEventRepository.findAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListEsocialEventsUseCase;
