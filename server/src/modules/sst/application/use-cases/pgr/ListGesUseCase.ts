/**
 * Use case: listar Grupos de Exposição Similar (GES).
 *
 * @module modules/sst/application/use-cases/pgr/ListGesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import PgrRepository from '../../../domain/repositories/PgrRepository';
import { toGesDTO } from '../../../infrastructure/mappers/PgrMapper';

class ListGesUseCase extends UseCase<Record<string, any>, any> {
  private readonly pgrRepository: PgrRepository;

  public constructor(pgrRepository: PgrRepository) {
    super();
    this.pgrRepository = pgrRepository;
  }

  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.pgrRepository.findGesAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toGesDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListGesUseCase;
