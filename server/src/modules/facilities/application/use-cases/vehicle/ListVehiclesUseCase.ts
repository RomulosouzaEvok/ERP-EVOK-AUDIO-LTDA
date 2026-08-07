/**
 * Caso de uso: listagem paginada de veículos de frota, cobrindo o fluxo do
 * endpoint `GET /api/facilities/vehicles`. Filtros: `status` (Asset),
 * `fuel_type`, `document_expiring`, `preventive_due`.
 *
 * @module modules/facilities/application/use-cases/vehicle/ListVehiclesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

type ListVehiclesInput = {
  status?: string;
  fuel_type?: string;
  document_expiring?: boolean;
  preventive_due?: boolean;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListVehiclesUseCase extends UseCase<ListVehiclesInput, any> {
  private readonly vehicleRepository: VehicleRepository;

  constructor(vehicleRepository: VehicleRepository) {
    super();
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ status, fuel_type, document_expiring, preventive_due, page = 1, limit = 20, offset = 0 }: ListVehiclesInput = {}) {
    const { rows, count } = await this.vehicleRepository.listVehicles(
      { status, fuel_type, document_expiring, preventive_due },
      { limit, offset },
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListVehiclesUseCase;
