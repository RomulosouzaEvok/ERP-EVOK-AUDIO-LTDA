/**
 * Caso de uso: criação de registro de abastecimento, cobrindo o fluxo do
 * endpoint `POST /api/facilities/fuel-records`.
 *
 * Valida que o veículo informado existe e, se `total_cost` não vier
 * explicitamente, calcula-o a partir de `liters * price_per_liter`
 * (conveniência — o cliente pode enviar o total já calculado se preferir).
 *
 * @module modules/facilities/application/use-cases/fuelRecord/CreateFuelRecordUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

type CreateFuelRecordInput = Record<string, any>;

class CreateFuelRecordUseCase extends UseCase<CreateFuelRecordInput, any> {
  private readonly fuelRecordRepository: FuelRecordRepository;
  private readonly vehicleRepository: VehicleRepository;

  constructor(fuelRecordRepository: FuelRecordRepository, vehicleRepository: VehicleRepository) {
    super();
    this.fuelRecordRepository = fuelRecordRepository;
    this.vehicleRepository = vehicleRepository;
  }

  /**
   * @throws {NotFoundError} Se `vehicle_id` não corresponder a um veículo existente.
   */
  async execute(input: CreateFuelRecordInput) {
    const vehicle = await this.vehicleRepository.findVehicleById(input.vehicle_id);
    if (!vehicle) {
      throw new NotFoundError('Veículo não encontrado.');
    }

    const totalCost = input.total_cost ?? Number(input.liters) * Number(input.price_per_liter);

    return this.fuelRecordRepository.createFuelRecord({ ...input, total_cost: totalCost });
  }
}

export = CreateFuelRecordUseCase;
