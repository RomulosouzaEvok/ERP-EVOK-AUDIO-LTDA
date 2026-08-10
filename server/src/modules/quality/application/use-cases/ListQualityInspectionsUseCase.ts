/**
 * Use case: listar inspeções de qualidade (G7).
 *
 * @module modules/quality/application/use-cases/ListQualityInspectionsUseCase
 *
 * Cobre `GET /api/quality/inspections`. Leitura pura, sem efeito colateral —
 * é o relatório de evidência que uma auditoria ISO 9001 §8.6 pede ("mostre
 * as liberações do período e contra qual critério cada uma foi feita").
 */

import UseCase from '../../../../shared/application/UseCase';
import QualityRepository = require('../../domain/repositories/QualityRepository');
import { INSPECTION_STAGES, INSPECTION_VERDICTS } from '../../domain/constants';

interface ListQualityInspectionsInput {
  lot_id?: number | string;
  verdict?: string;
  stage?: string;
  inspector_id?: number | string;
  page?: number | string;
  limit?: number | string;
}

class ListQualityInspectionsUseCase extends UseCase<ListQualityInspectionsInput, any> {
  private readonly qualityRepository: QualityRepository;

  /** @param qualityRepository - Repositório de qualidade. */
  public constructor(qualityRepository: QualityRepository) {
    super();
    this.qualityRepository = qualityRepository;
  }

  /**
   * @param input - Filtros e paginação. Filtros com valor fora do ENUM são
   *   IGNORADOS (não viram `where`), para não gerar um 500 do Postgres a
   *   partir de um query string digitado errado.
   * @returns `{ rows, total, page, limit, totalPages }`.
   */
  public async execute(input: ListQualityInspectionsInput = {}): Promise<any> {
    const where: Record<string, unknown> = {};
    if (input.lot_id) where.lot_id = input.lot_id;
    if (input.inspector_id) where.inspector_id = input.inspector_id;
    if (input.verdict && (INSPECTION_VERDICTS as readonly string[]).includes(String(input.verdict))) {
      where.verdict = input.verdict;
    }
    if (input.stage && (INSPECTION_STAGES as readonly string[]).includes(String(input.stage))) {
      where.stage = input.stage;
    }

    const page = Math.max(1, parseInt(String(input.page ?? 1), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(input.limit ?? 20), 10) || 20));
    const offset = (page - 1) * limit;

    const { rows, count } = await this.qualityRepository.listInspections(where, { limit, offset });

    return {
      rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }
}

export = ListQualityInspectionsUseCase;
