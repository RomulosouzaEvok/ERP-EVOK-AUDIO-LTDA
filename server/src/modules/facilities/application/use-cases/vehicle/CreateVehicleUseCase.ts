/**
 * Caso de uso: criação de veículo de frota, cobrindo o fluxo do endpoint
 * `POST /api/facilities/vehicles`. Desde o BLOCO 4 FAC (correção, D-2),
 * cria o `Asset` (`asset_type='vehicle'`) e a extensão
 * `FacilityVehicleDetail` NUMA ÚNICA TRANSAÇÃO (RF-FAC-006) — se qualquer
 * um dos dois falhar, nenhum é persistido.
 *
 * @module modules/facilities/application/use-cases/vehicle/CreateVehicleUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, ValidationError } from '../../../../../errors';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';
import AssetService from '../../services/AssetService';
import { sequelize } from '../../../../../config/database';

type CreateVehicleInput = Record<string, any>;

class CreateVehicleUseCase extends UseCase<CreateVehicleInput, any> {
  private readonly vehicleRepository: VehicleRepository;
  private readonly assetService: AssetService;

  constructor(vehicleRepository: VehicleRepository, assetService: AssetService) {
    super();
    this.vehicleRepository = vehicleRepository;
    this.assetService = assetService;
  }

  /**
   * @throws {ValidationError} Se `plate`, `brand`, `model` ou `fuel_type` ausentes.
   * @throws {ConflictError} Se já existir um veículo com a mesma placa.
   */
  async execute(input: CreateVehicleInput) {
    if (!input.plate || !input.brand || !input.model || !input.fuel_type) {
      throw new ValidationError('Placa, marca, modelo e tipo de combustível são obrigatórios.');
    }

    const plate = String(input.plate).trim().toUpperCase();

    const existing = await this.vehicleRepository.findVehicleByPlate(plate);
    if (existing) {
      throw new ConflictError(`Já existe um veículo com a placa ${plate}.`);
    }

    return sequelize.transaction(async (transaction) => {
      const asset = await this.assetService.create(
        {
          tag: plate,
          name: [input.brand, input.model].filter(Boolean).join(' ') || `Veículo ${plate}`,
          asset_type: 'vehicle',
          brand: input.brand,
          model: input.model,
          department_id: input.department_id ?? null,
          responsible_id: input.responsible_id ?? null,
          status: 'active',
          notes: input.notes ?? null,
        },
        transaction,
      );

      const vehicleDetail = await this.vehicleRepository.createVehicleDetail(
        {
          asset_id: asset.id,
          plate,
          renavam: input.renavam ?? null,
          chassi: input.chassi ?? null,
          color: input.color ?? null,
          year: input.year ?? null,
          fuel_type: input.fuel_type,
          current_km: input.current_km ?? 0,
          tank_capacity_liters: input.tank_capacity_liters ?? null,
          required_cnh_category: input.required_cnh_category ?? null,
        },
        transaction,
      );

      return { asset_id: asset.id, asset, vehicle_detail: vehicleDetail };
    });
  }
}

export = CreateVehicleUseCase;
