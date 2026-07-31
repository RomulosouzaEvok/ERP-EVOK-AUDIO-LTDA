/**
 * Use case: listar ordens de manutenção com filtros e paginacao.
 *
 * @module modules/maintenance/application/use-cases/ListMaintenanceOrdersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';

interface ListMaintenanceOrdersInput {
  page?: string | number;
  limit?: string | number;
  status?: string;
  asset_id?: string | number;
}

interface ListMaintenanceOrdersOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListMaintenanceOrdersUseCase extends UseCase<ListMaintenanceOrdersInput, ListMaintenanceOrdersOutput> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Filtros e paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListMaintenanceOrdersInput): Promise<ListMaintenanceOrdersOutput> {
    const { page = '1', limit = '10', status, asset_id } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.maintenanceRepository.findAndCountAll(
      { status, asset_id },
      { limit: l, offset: o }
    );

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListMaintenanceOrdersUseCase;
