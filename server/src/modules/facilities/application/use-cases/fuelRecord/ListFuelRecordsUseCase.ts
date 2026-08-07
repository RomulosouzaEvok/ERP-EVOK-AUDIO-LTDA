/**
 * Caso de uso: listagem paginada de registros de abastecimento, cobrindo o
 * fluxo do endpoint `GET /api/facilities/fuel-records`.
 *
 * @module modules/facilities/application/use-cases/fuelRecord/ListFuelRecordsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';

type ListFuelRecordsInput = { vehicle_id?: number; page?: number; limit?: number; offset?: number };

class ListFuelRecordsUseCase extends UseCase<ListFuelRecordsInput, any> {
  private readonly fuelRecordRepository: FuelRecordRepository;

  constructor(fuelRecordRepository: FuelRecordRepository) {
    super();
    this.fuelRecordRepository = fuelRecordRepository;
  }

  async execute({ vehicle_id, page = 1, limit = 20, offset = 0 }: ListFuelRecordsInput = {}) {
    const { rows, count } = await this.fuelRecordRepository.listFuelRecords({ vehicle_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListFuelRecordsUseCase;
