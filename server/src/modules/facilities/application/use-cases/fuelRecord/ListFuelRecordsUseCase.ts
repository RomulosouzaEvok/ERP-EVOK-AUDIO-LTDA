/**
 * Caso de uso: listagem paginada de registros de abastecimento, cobrindo o
 * fluxo do endpoint `GET /api/facilities/fuel-records`. Filtro por
 * `asset_id` (BLOCO 4 FAC — antes `vehicle_id`, D-2).
 *
 * @module modules/facilities/application/use-cases/fuelRecord/ListFuelRecordsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';

type ListFuelRecordsInput = { asset_id?: number; full_tank?: boolean; page?: number; limit?: number; offset?: number };

class ListFuelRecordsUseCase extends UseCase<ListFuelRecordsInput, any> {
  private readonly fuelRecordRepository: FuelRecordRepository;

  constructor(fuelRecordRepository: FuelRecordRepository) {
    super();
    this.fuelRecordRepository = fuelRecordRepository;
  }

  async execute({ asset_id, full_tank, page = 1, limit = 20, offset = 0 }: ListFuelRecordsInput = {}) {
    const { rows, count } = await this.fuelRecordRepository.listFuelRecords({ asset_id, full_tank }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListFuelRecordsUseCase;
