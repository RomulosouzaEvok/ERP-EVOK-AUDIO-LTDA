/**
 * `GET /api/ti/licenses` — lista licenças (join `assets` ×
 * `ItSoftwareLicenseDetail`, RF-TI-024/028/029).
 *
 * @module modules/ti/application/use-cases/license/ListLicensesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { toLicenseDTO } from '../../../infrastructure/mappers/LicenseMapper';

interface Input {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListLicensesUseCase extends UseCase<Input, any> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCountLicenses(filters, { limit, offset });
    const rowsWithSeats = await Promise.all(rows.map(async (row: any) => toLicenseDTO(row, await this.repository.countActiveSeats(row.id))));
    return { rows: rowsWithSeats, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListLicensesUseCase;
