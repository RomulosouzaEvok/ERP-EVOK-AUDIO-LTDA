/**
 * Use case: listar logs de auditoria com filtros e paginacao.
 *
 * @module modules/auditLogs/application/use-cases/ListAuditLogsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import AuditLogsRepository from '../../domain/repositories/AuditLogsRepository';

interface ListAuditLogsInput {
  page?: string | number;
  limit?: string | number;
  entity_type?: string;
  entity_id?: string | number;
  action?: string;
  start_date?: string;
  end_date?: string;
}

interface ListAuditLogsOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListAuditLogsUseCase extends UseCase<ListAuditLogsInput, ListAuditLogsOutput> {
  private readonly auditLogsRepository: AuditLogsRepository;

  /** @param auditLogsRepository - Repositorio de logs de auditoria. */
  public constructor(auditLogsRepository: AuditLogsRepository) {
    super();
    this.auditLogsRepository = auditLogsRepository;
  }

  /**
   * @param input - Filtros e paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListAuditLogsInput): Promise<ListAuditLogsOutput> {
    const { page = '1', limit = '10', entity_type, entity_id, action, start_date, end_date } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.auditLogsRepository.findAndCountAll(
      { entity_type, entity_id, action, start_date, end_date },
      { limit: l, offset: o }
    );

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListAuditLogsUseCase;
