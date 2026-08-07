/**
 * Caso de uso: criação de veículo de frota, cobrindo o fluxo do endpoint
 * `POST /api/facilities/vehicles`.
 *
 * @module modules/facilities/application/use-cases/vehicle/CreateVehicleUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError } from '../../../../../errors';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

type CreateVehicleInput = Record<string, any>;

class CreateVehicleUseCase extends UseCase<CreateVehicleInput, any> {
  private readonly vehicleRepository: VehicleRepository;

  constructor(vehicleRepository: VehicleRepository) {
    super();
    this.vehicleRepository = vehicleRepository;
  }

  /**
   * @throws {ConflictError} Se já existir um veículo com a mesma placa.
   */
  async execute(input: CreateVehicleInput) {
    const plate = String(input.plate).trim().toUpperCase();

    const existing = await this.vehicleRepository.findVehicleByPlate(plate);
    if (existing) {
      throw new ConflictError(`Já existe um veículo com a placa ${plate}.`);
    }

    return this.vehicleRepository.createVehicle({ ...input, plate });
  }
}

export = CreateVehicleUseCase;
