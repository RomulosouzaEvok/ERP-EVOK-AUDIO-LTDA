/**
 * Caso de uso: atualização de um veículo de frota, cobrindo o fluxo do
 * endpoint `PUT /api/facilities/vehicles/:id`.
 *
 * @module modules/facilities/application/use-cases/vehicle/UpdateVehicleUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../../errors';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

type UpdateVehicleInput = { id: number } & Record<string, any>;

class UpdateVehicleUseCase extends UseCase<UpdateVehicleInput, any> {
  private readonly vehicleRepository: VehicleRepository;

  constructor(vehicleRepository: VehicleRepository) {
    super();
    this.vehicleRepository = vehicleRepository;
  }

  /**
   * @throws {NotFoundError} Se o veículo não existir.
   * @throws {ConflictError} Se `plate` colidir com outro veículo.
   */
  async execute({ id, ...rest }: UpdateVehicleInput) {
    const current = await this.vehicleRepository.findVehicleById(id);
    if (!current) {
      throw new NotFoundError('Veículo não encontrado.');
    }

    const updateData: Record<string, unknown> = { ...rest };

    if (typeof rest.plate === 'string') {
      const normalizedPlate = rest.plate.trim().toUpperCase();
      const existing = await this.vehicleRepository.findVehicleByPlate(normalizedPlate);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Já existe um veículo com a placa ${normalizedPlate}.`);
      }
      updateData.plate = normalizedPlate;
    }

    return this.vehicleRepository.updateVehicle(id, updateData);
  }
}

export = UpdateVehicleUseCase;
