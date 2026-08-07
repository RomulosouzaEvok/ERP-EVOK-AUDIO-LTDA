/**
 * Use case: listar mandatos da CIPA.
 *
 * @module modules/sst/application/use-cases/cipa/ListMandatesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { toMandateDTO } from '../../../infrastructure/mappers/CipaMapper';

class ListMandatesUseCase extends UseCase<Record<string, any>, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /** @param input - Filtros (`status`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.cipaRepository.findMandatesAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toMandateDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListMandatesUseCase;
