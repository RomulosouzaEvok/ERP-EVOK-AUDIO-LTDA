/**
 * Caso de uso: criação de registro de abastecimento, cobrindo o fluxo do
 * endpoint `POST /api/facilities/fuel-records`. Valida km/tanque
 * (RF-FAC-022/024), atualiza `current_km` (RF-FAC-023, único caminho
 * legítimo junto com retorno de uso — RNF-FAC-01) e calcula alerta de
 * anomalia de consumo ±30% (RF-FAC-026, P1) na mesma transação.
 *
 * @module modules/facilities/application/use-cases/fuelRecord/CreateFuelRecordUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../../errors';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';
import { sequelize } from '../../../../../config/database';

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
   * @throws {NotFoundError} Se `asset_id` não corresponder a um veículo existente.
   * @throws {BusinessRuleError} `km_at_refuel` menor que o maior km conhecido (RF-FAC-022), ou `liters` acima da capacidade do tanque (RF-FAC-024).
   */
  async execute(input: CreateFuelRecordInput) {
    const vehicle = await this.vehicleRepository.findVehicleByAssetId(input.asset_id);
    if (!vehicle) {
      throw new NotFoundError('Veículo não encontrado.');
    }

    if (input.km_at_refuel !== undefined && input.km_at_refuel !== null) {
      if (Number(input.km_at_refuel) < Number(vehicle.current_km)) {
        throw new BusinessRuleError(
          `km_at_refuel (${input.km_at_refuel}) não pode ser menor que o km atual conhecido do veículo (${vehicle.current_km}).`,
          { rule: 'RF-FAC-022' },
        );
      }
    }

    if (vehicle.tank_capacity_liters && Number(input.liters) > Number(vehicle.tank_capacity_liters)) {
      throw new BusinessRuleError(
        `liters (${input.liters}) excede a capacidade do tanque cadastrada (${vehicle.tank_capacity_liters}).`,
        { rule: 'RF-FAC-024' },
      );
    }

    const totalCost = input.total_cost ?? Number(input.liters) * Number(input.unit_price ?? input.price_per_liter);

    return sequelize.transaction(async (transaction) => {
      const record = await this.fuelRecordRepository.createFuelRecord({
        asset_id: input.asset_id,
        record_date: input.record_date ?? new Date(),
        km_at_refuel: input.km_at_refuel ?? null,
        liters: input.liters,
        price_per_liter: input.unit_price ?? input.price_per_liter,
        total_cost: totalCost,
        fuel_station: input.fuel_station ?? null,
        driver_id: input.driver_id ?? null,
        full_tank: input.full_tank ?? false,
        invoice_ref: input.invoice_ref ?? null,
        trip_id: input.trip_id ?? null,
      });

      if (input.km_at_refuel !== undefined && input.km_at_refuel !== null) {
        const newKm = Math.max(Number(vehicle.current_km), Number(input.km_at_refuel));
        await this.vehicleRepository.updateVehicleDetail(input.asset_id, { current_km: newKm }, transaction);
      }

      const consumptionAlert = await this.calculateConsumptionAlert(input.asset_id, input.full_tank);

      return { ...(record.toJSON ? record.toJSON() : record), consumption_alert: consumptionAlert };
    });
  }

  /**
   * Anomalia de consumo (RF-FAC-026, P1): compara o consumo km/l entre os
   * dois últimos abastecimentos `full_tank=true` com a média histórica —
   * `null` se não houver histórico suficiente (menos de 3 pontos).
   */
  private async calculateConsumptionAlert(assetId: number, fullTank: boolean): Promise<boolean | null> {
    if (!fullTank) return null;

    const recent = await this.fuelRecordRepository.listRecentFullTank(assetId, 5);
    if (recent.length < 3) return null;

    const consumptions: number[] = [];
    for (let i = 0; i < recent.length - 1; i++) {
      const current = recent[i];
      const previous = recent[i + 1];
      if (current.km_at_refuel === null || previous.km_at_refuel === null) continue;
      const distance = Number(current.km_at_refuel) - Number(previous.km_at_refuel);
      if (distance <= 0) continue;
      consumptions.push(distance / Number(current.liters));
    }

    if (consumptions.length < 2) return null;

    const latest = consumptions[0];
    const historicalAvg = consumptions.slice(1).reduce((sum, c) => sum + c, 0) / consumptions.slice(1).length;
    if (historicalAvg === 0) return null;

    const deviation = Math.abs(latest - historicalAvg) / historicalAvg;
    return deviation > 0.3;
  }
}

export = CreateFuelRecordUseCase;
