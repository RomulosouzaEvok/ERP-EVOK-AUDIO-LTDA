/**
 * Caso de uso: busca de um registro de abastecimento por id, cobrindo o
 * fluxo do endpoint `GET /api/facilities/fuel-records/:id`.
 *
 * @module modules/facilities/application/use-cases/fuelRecord/GetFuelRecordByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';

type GetFuelRecordByIdInput = { id: number };

class GetFuelRecordByIdUseCase extends UseCase<GetFuelRecordByIdInput, any> {
  private readonly fuelRecordRepository: FuelRecordRepository;

  constructor(fuelRecordRepository: FuelRecordRepository) {
    super();
    this.fuelRecordRepository = fuelRecordRepository;
  }

  async execute({ id }: GetFuelRecordByIdInput) {
    const record = await this.fuelRecordRepository.findFuelRecordById(id);
    if (!record) {
      throw new NotFoundError('Registro de abastecimento não encontrado.');
    }
    return record;
  }
}

export = GetFuelRecordByIdUseCase;
