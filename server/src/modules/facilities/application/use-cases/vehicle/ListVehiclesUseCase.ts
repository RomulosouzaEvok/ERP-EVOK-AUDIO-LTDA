/**
 * Caso de uso: listagem paginada de veículos de frota, cobrindo o fluxo do
 * endpoint `GET /api/facilities/vehicles`.
 *
 * @module modules/facilities/application/use-cases/vehicle/ListVehiclesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

type ListVehiclesInput = { status?: string; page?: number; limit?: number; offset?: number };

class ListVehiclesUseCase extends UseCase<ListVehiclesInput, any> {
  private readonly vehicleRepository: VehicleRepository;

  constructor(vehicleRepository: VehicleRepository) {
    super();
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ status, page = 1, limit = 20, offset = 0 }: ListVehiclesInput = {}) {
    const { rows, count } = await this.vehicleRepository.listVehicles({ status }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListVehiclesUseCase;
