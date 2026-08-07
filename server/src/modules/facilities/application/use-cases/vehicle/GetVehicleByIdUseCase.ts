/**
 * Caso de uso: busca de um veículo de frota por id, cobrindo o fluxo do
 * endpoint `GET /api/facilities/vehicles/:id`.
 *
 * @module modules/facilities/application/use-cases/vehicle/GetVehicleByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

type GetVehicleByIdInput = { id: number };

class GetVehicleByIdUseCase extends UseCase<GetVehicleByIdInput, any> {
  private readonly vehicleRepository: VehicleRepository;

  constructor(vehicleRepository: VehicleRepository) {
    super();
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ id }: GetVehicleByIdInput) {
    const vehicle = await this.vehicleRepository.findVehicleById(id);
    if (!vehicle) {
      throw new NotFoundError('Veículo não encontrado.');
    }
    return vehicle;
  }
}

export = GetVehicleByIdUseCase;
