/**
 * Caso de uso: atualização da extensão de um veículo de frota, cobrindo o
 * fluxo do endpoint `PUT /api/facilities/vehicles/:assetId`. Campos de
 * `Asset` (marca/modelo/status/responsável) são atualizados via
 * `PUT /api/assets/:id` existente, não duplicados aqui (contrato §2.2).
 *
 * @module modules/facilities/application/use-cases/vehicle/UpdateVehicleUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError, ValidationError } from '../../../../../errors';
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
   * @throws {ValidationError} Se `current_km` for informado com valor diferente do atual (RNF-FAC-01 — único caminho legítimo é retorno de uso/abastecimento).
   */
  async execute({ id, ...rest }: UpdateVehicleInput) {
    const current = await this.vehicleRepository.findVehicleByAssetId(id);
    if (!current) {
      throw new NotFoundError('Veículo não encontrado.');
    }

    const updateData: Record<string, unknown> = { ...rest };

    if (updateData.current_km !== undefined) {
      if (Number(updateData.current_km) !== Number(current.current_km)) {
        throw new ValidationError(
          'current_km não pode ser alterado diretamente — só é gravável por retorno de uso (POST /trips/:id/return) ou abastecimento validado (POST /fuel-records).',
        );
      }
      delete updateData.current_km;
    }

    if (typeof rest.plate === 'string') {
      const normalizedPlate = rest.plate.trim().toUpperCase();
      const existing = await this.vehicleRepository.findVehicleByPlate(normalizedPlate);
      if (existing && existing.asset_id !== id) {
        throw new ConflictError(`Já existe um veículo com a placa ${normalizedPlate}.`);
      }
      updateData.plate = normalizedPlate;
    }

    return this.vehicleRepository.updateVehicleDetail(id, updateData);
  }
}

export = UpdateVehicleUseCase;
