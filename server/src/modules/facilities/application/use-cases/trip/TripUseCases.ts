/**
 * Casos de uso de Diário de Uso (Saída/Retorno de veículo — RF-FAC-016 a
 * 021, RNF-FAC-01), fluxo mais crítico do BLOCO 4 FAC. Máquina de estados
 * de 2 passos: `scheduled → out → returned` (ou `canceled` antes de
 * `returned`). Cobre UC-58 (E1-E4, A1).
 *
 * @module modules/facilities/application/use-cases/trip/TripUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../../../errors';
import TripRepository from '../../../domain/repositories/TripRepository';
import DriverRepository from '../../../domain/repositories/DriverRepository';
import VehicleDocumentRepository from '../../../domain/repositories/VehicleDocumentRepository';
import AssetService from '../../services/AssetService';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';
import { sequelize } from '../../../../../config/database';

/** `GET /api/facilities/trips` */
export class ListTripsUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly tripRepository: TripRepository) {
    super();
  }

  async execute({ asset_id, driver_id, status, purpose, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.tripRepository.list({ asset_id, driver_id, status, purpose }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `GET /api/facilities/trips/:id` */
export class GetTripByIdUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly tripRepository: TripRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const trip = await this.tripRepository.findById(id);
    if (!trip) throw new NotFoundError('Uso de veículo não encontrado.');
    return trip;
  }
}

/** `POST /api/facilities/trips` — agenda o uso; toda validação pesada acontece em `.../depart`. */
export class CreateTripUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly tripRepository: TripRepository) {
    super();
  }

  async execute(input: Record<string, any> & { requestedBy: number }) {
    const { asset_id, driver_id, purpose, destination, scheduled_departure_at, requestedBy } = input;
    if (!asset_id || !driver_id || !purpose) {
      throw new ValidationError('asset_id, driver_id e purpose são obrigatórios.');
    }

    return this.tripRepository.create({
      asset_id,
      driver_id,
      requested_by: requestedBy,
      purpose,
      destination: destination ?? null,
      departure_at: scheduled_departure_at ?? null,
      status: 'scheduled',
    });
  }
}

/**
 * `POST /api/facilities/trips/:id/depart` — registra saída, validando
 * elegibilidade completa (E1-E4 do UC-58) numa única transação.
 */
export class DepartTripUseCase extends UseCase<Record<string, any>, any> {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly driverRepository: DriverRepository,
    private readonly documentRepository: VehicleDocumentRepository,
    private readonly assetService: AssetService,
  ) {
    super();
  }

  /**
   * @throws {BusinessRuleError} CRLV vencido (E1), condutor não autorizado/CNH vencida/categoria incompatível (E2 variante condutor), `Asset.status='in_maintenance'` (E4).
   * @throws {ForbiddenError} Seguro vencido sem liberação registrada (E2); `departure_km` retroativo sem justificativa + nível approve (A1/RF-FAC-017).
   * @throws {ConflictError} Uso em aberto para o veículo ou o condutor (E3).
   */
  async execute(input: { id: number; departure_km?: number; fuel_level_out?: number; notes?: string; divergence_justification?: string; hasApproveLevel: boolean; approvedBy?: number }) {
    const trip = await this.tripRepository.findById(input.id);
    if (!trip) throw new NotFoundError('Uso de veículo não encontrado.');
    if (trip.status !== 'scheduled') throw new BusinessRuleError(`Uso já está em status '${trip.status}' — só é possível registrar saída de um uso 'scheduled'.`);

    // 1. Asset.status == 'active' (E4)
    const asset = await this.assetService.findById(trip.asset_id);
    if (!asset || asset.status === 'in_maintenance') {
      throw new BusinessRuleError('Veículo está em manutenção — não é possível registrar saída.', { rule: 'E4' });
    }

    // 2. CRLV vencido (E1)
    const crlv = await this.documentRepository.findLatestByAssetAndType(trip.asset_id, 'crlv_licenciamento');
    if (crlv && crlv.valid_until && new Date(crlv.valid_until) < new Date()) {
      throw new BusinessRuleError('CRLV/licenciamento do veículo está vencido — saída bloqueada.', { rule: 'E1' });
    }

    // 3. Seguro vencido sem liberação registrada (E2)
    const insurance = await this.documentRepository.findLatestByAssetAndType(trip.asset_id, 'seguro');
    if (insurance && insurance.valid_until && new Date(insurance.valid_until) < new Date() && !insurance.released_by) {
      throw new ForbiddenError('Seguro do veículo está vencido — exige liberação prévia (POST .../documents/:docId/release).', { rule: 'E2' });
    }

    // 4. Condutor autorizado, CNH válida, categoria compatível
    const driver = await this.driverRepository.findById(trip.driver_id);
    if (!driver || !driver.authorized) {
      throw new BusinessRuleError('Condutor não está autorizado a conduzir.', { rule: 'E2' });
    }
    if (new Date(driver.cnh_valid_until) < new Date()) {
      throw new BusinessRuleError('CNH do condutor está vencida.', { rule: 'E2' });
    }

    // 5. Nenhum outro uso 'out' para o mesmo veículo/condutor (E3)
    const openForAsset = await this.tripRepository.findOpenTrip({ asset_id: trip.asset_id });
    if (openForAsset && openForAsset.id !== trip.id) {
      throw new ConflictError('Já existe um uso em aberto para este veículo.', { rule: 'E3' });
    }
    const openForDriver = await this.tripRepository.findOpenTrip({ driver_id: trip.driver_id });
    if (openForDriver && openForDriver.id !== trip.id) {
      throw new ConflictError('Já existe um uso em aberto para este condutor.', { rule: 'E3' });
    }

    // 6. departure_km >= maior return_km conhecido (A1/RF-FAC-017)
    const departureKm = input.departure_km ?? null;
    let odometerOverride: Record<string, unknown> = {};
    if (departureKm !== null) {
      const maxReturnKm = await this.tripRepository.findMaxReturnKm(trip.asset_id);
      if (maxReturnKm !== null && departureKm < maxReturnKm) {
        if (!input.divergence_justification || !input.hasApproveLevel) {
          throw new ForbiddenError(
            `departure_km (${departureKm}) é menor que o último km conhecido (${maxReturnKm}) — exige divergence_justification e nível approve.`,
            { rule: 'A1' },
          );
        }
        odometerOverride = {
          odometer_override_reason: input.divergence_justification,
          odometer_override_approved_by: input.approvedBy,
          odometer_override_approved_at: new Date(),
        };
      }
    }

    return this.tripRepository.update(trip.id, {
      status: 'out',
      departure_at: new Date(),
      departure_km: departureKm,
      fuel_level_out: input.fuel_level_out ?? null,
      ...odometerOverride,
    });
  }
}

/**
 * `POST /api/facilities/trips/:id/return` — registra retorno; atualiza
 * `current_km` na mesma transação (único caminho legítimo junto com
 * abastecimento — RNF-FAC-01).
 */
export class ReturnTripUseCase extends UseCase<{ id: number; return_km: number; fuel_level_in?: number; incidents?: string }, any> {
  constructor(private readonly tripRepository: TripRepository, private readonly vehicleRepository: VehicleRepository) {
    super();
  }

  /** @throws {BusinessRuleError} `return_km < departure_km` do mesmo uso (RF-FAC-018, sem exceção). */
  async execute(input: { id: number; return_km: number; fuel_level_in?: number; incidents?: string }) {
    return sequelize.transaction(async (transaction) => {
      const trip = await this.tripRepository.findByIdForUpdate(input.id, transaction);
      if (!trip) throw new NotFoundError('Uso de veículo não encontrado.');
      if (trip.status !== 'out') throw new BusinessRuleError(`Uso está em status '${trip.status}' — só é possível registrar retorno de um uso 'out'.`);

      if (trip.departure_km !== null && input.return_km < trip.departure_km) {
        throw new BusinessRuleError(`return_km (${input.return_km}) não pode ser menor que departure_km (${trip.departure_km}).`, { rule: 'RF-FAC-018' });
      }

      await this.tripRepository.update(
        trip.id,
        {
          status: 'returned',
          return_at: new Date(),
          return_km: input.return_km,
          fuel_level_in: input.fuel_level_in ?? null,
          incidents: input.incidents ?? null,
        },
        transaction,
      );

      await this.vehicleRepository.updateVehicleDetail(trip.asset_id, { current_km: input.return_km }, transaction);

      return this.tripRepository.findById(trip.id);
    });
  }
}

/** `POST /api/facilities/trips/:id/cancel` — cancela uso `scheduled`/`out` com motivo. */
export class CancelTripUseCase extends UseCase<{ id: number; cancel_reason: string }, any> {
  constructor(private readonly tripRepository: TripRepository) {
    super();
  }

  /** @throws {ValidationError} Se `cancel_reason` ausente. @throws {BusinessRuleError} Se o uso já estiver `returned`/`canceled`. */
  async execute({ id, cancel_reason }: { id: number; cancel_reason: string }) {
    if (!cancel_reason) throw new ValidationError('cancel_reason é obrigatório.');

    const trip = await this.tripRepository.findById(id);
    if (!trip) throw new NotFoundError('Uso de veículo não encontrado.');
    if (!['scheduled', 'out'].includes(trip.status)) {
      throw new BusinessRuleError(`Uso em status '${trip.status}' não pode ser cancelado.`);
    }

    return this.tripRepository.update(id, { status: 'canceled', cancel_reason });
  }
}
