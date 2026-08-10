/**
 * `GET /api/rh/employee-contracts` — filtros `employee_id`/`status`/`type`/`expiring_in_days`.
 * Aplica a mesma verificação ativa de vencimento (RF-RH-016) a cada linha retornada.
 *
 * @module modules/rh/application/use-cases/contract/ListEmployeeContractsUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import EmployeeContractRepository from '../../../domain/repositories/EmployeeContractRepository';
import { applyAutoExpireIfNeeded } from '../../../domain/services/experienceContractAutoExpire';

class ListEmployeeContractsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: EmployeeContractRepository;

  public constructor(repository: EmployeeContractRepository) {
    super();
    this.repository = repository;
  }

  public async execute(filters: Record<string, any>): Promise<any> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset: (page - 1) * limit });
    const withAutoExpire = await Promise.all(rows.map((row) => applyAutoExpireIfNeeded(this.repository, row)));
    return { rows: withAutoExpire, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListEmployeeContractsUseCase;
