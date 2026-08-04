/**
 * Use case: listar não conformidades com filtros e paginacao.
 *
 * Bloco 3 (UC-40, BUSINESS_RULES.md §10): cada linha ganha o campo aditivo
 * `handoff_signal` (`green|yellow|red`), calculado via
 * `calculateHandoffSignal('non_conformity', ...)` — fila de tratativa de
 * Qualidade (Recebimento/Qualidade → RNC). Campo sempre calculado
 * on-the-fly, nunca persistido.
 *
 * @module modules/nonConformities/application/use-cases/ListNonConformitiesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
import { calculateHandoffSignal } from '../../../../shared/domain/handoffSignal';

interface ListNonConformitiesInput {
  page?: string | number;
  limit?: string | number;
  status?: string;
  severity?: string;
}

interface ListNonConformitiesOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListNonConformitiesUseCase extends UseCase<ListNonConformitiesInput, ListNonConformitiesOutput> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Filtros e paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListNonConformitiesInput): Promise<ListNonConformitiesOutput> {
    const { page = '1', limit = '10', status, severity } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.nonConformitiesRepository.findAndCountAll(
      { status, severity },
      { limit: l, offset: o }
    );

    const rowsWithSignal = rows.map((row: any) => {
      const json = row.toJSON ? row.toJSON() : row;
      return {
        ...json,
        handoff_signal: calculateHandoffSignal('non_conformity', {
          status: json.status,
          effectiveness_result: json.effectiveness_result,
        }),
      };
    });

    return { rows: rowsWithSignal, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListNonConformitiesUseCase;
