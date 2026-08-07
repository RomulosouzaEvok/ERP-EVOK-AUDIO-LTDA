/**
 * Casos de uso de Multa (Prazo Legal de Indicação de Condutor — RF-FAC-028
 * a 035, UC-59), maior exposição legal do BLOCO 4 FAC (CTB Art. 257 §7º).
 *
 * @module modules/facilities/application/use-cases/fine/FineUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../../../errors';
import FineRepository from '../../../domain/repositories/FineRepository';
import TripRepository from '../../../domain/repositories/TripRepository';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';
import AccountPayableService from '../../services/AccountPayableService';

/** Prazo padrão de indicação de condutor (dias), CTB Art. 257 §7º — parametrizável via env (RF-FAC-029). */
const DEFAULT_INDICATION_DEADLINE_DAYS = Number(process.env.FACILITIES_FINE_INDICATION_DEADLINE_DAYS ?? 30);

/**
 * Transição automática `pending → expired_nic` ao vencer o prazo sem
 * indicação (RF-FAC-031) — verificação ao acessar (mesmo padrão RNF-FAC-02
 * de outros blocos, sem trigger).
 */
async function syncExpiredIndication(fineRepository: FineRepository, fine: any): Promise<any> {
  if (fine.indication_status === 'pending' && fine.indication_deadline && new Date(fine.indication_deadline) < new Date()) {
    return fineRepository.update(fine.id, { indication_status: 'expired_nic' });
  }
  return fine;
}

/** `GET /api/facilities/fines` */
export class ListFinesUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly fineRepository: FineRepository) {
    super();
  }

  async execute({ asset_id, indication_status, status, deadline_expiring_days, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.fineRepository.list({ asset_id, indication_status, status, deadline_expiring_days }, { limit, offset });
    const synced = await Promise.all(rows.map((f: any) => syncExpiredIndication(this.fineRepository, f)));
    return { rows: synced, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `GET /api/facilities/fines/:id` */
export class GetFineByIdUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly fineRepository: FineRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const fine = await this.fineRepository.findById(id);
    if (!fine) throw new NotFoundError('Multa não encontrada.');
    return syncExpiredIndication(this.fineRepository, fine);
  }
}

/** `POST /api/facilities/fines` — calcula `indication_deadline` automaticamente e sugere condutor inline. */
export class CreateFineUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly fineRepository: FineRepository, private readonly vehicleRepository: VehicleRepository, private readonly tripRepository: TripRepository) {
    super();
  }

  /**
   * @throws {ValidationError} Se `asset_id`, `infraction_at`, `infraction_code` ou `amount` ausentes.
   * @throws {NotFoundError} Se `asset_id` não corresponder a veículo cadastrado.
   */
  async execute(input: Record<string, any>) {
    const { asset_id, infraction_at, infraction_code, amount, notice_received_at } = input;
    if (!asset_id || !infraction_at || !infraction_code || !amount) {
      throw new ValidationError('asset_id, infraction_at, infraction_code e amount são obrigatórios.');
    }

    const vehicle = await this.vehicleRepository.findVehicleByAssetId(asset_id);
    if (!vehicle) throw new NotFoundError('Veículo não encontrado.');

    let indicationDeadline: string | null = null;
    if (notice_received_at) {
      const deadline = new Date(notice_received_at);
      deadline.setDate(deadline.getDate() + DEFAULT_INDICATION_DEADLINE_DAYS);
      indicationDeadline = deadline.toISOString().slice(0, 10);
    }

    const fine = await this.fineRepository.create({
      asset_id,
      infraction_at,
      location: input.location ?? null,
      infraction_code,
      description: input.description ?? null,
      amount,
      points: input.points ?? null,
      notice_received_at: notice_received_at ?? null,
      indication_deadline: indicationDeadline,
      indication_status: 'pending',
      status: 'open',
    });

    const suggestedDriverId = await this.suggestDriver(asset_id, infraction_at);

    return { ...(fine.toJSON ? fine.toJSON() : fine), suggested_driver_id: suggestedDriverId };
  }

  private async suggestDriver(assetId: number, infractionAt: string): Promise<number | null> {
    const { rows } = await this.tripRepository.list({ asset_id: assetId }, { limit: 50, offset: 0 });
    const infractionDate = new Date(infractionAt);
    const match = rows.find((trip: any) => {
      if (!trip.departure_at) return false;
      const start = new Date(trip.departure_at);
      const end = trip.return_at ? new Date(trip.return_at) : new Date();
      return infractionDate >= start && infractionDate <= end;
    });
    return match ? match.driver_id : null;
  }
}

/** `GET /api/facilities/fines/:id/suggested-driver` — RF-FAC-032. */
export class SuggestFineDriverUseCase extends UseCase<{ id: number }, { suggested_driver_id: number | null }> {
  constructor(private readonly fineRepository: FineRepository, private readonly tripRepository: TripRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const fine = await this.fineRepository.findById(id);
    if (!fine) throw new NotFoundError('Multa não encontrada.');

    const { rows } = await this.tripRepository.list({ asset_id: fine.asset_id }, { limit: 50, offset: 0 });
    const infractionDate = new Date(fine.infraction_at);
    const match = rows.find((trip: any) => {
      if (!trip.departure_at) return false;
      const start = new Date(trip.departure_at);
      const end = trip.return_at ? new Date(trip.return_at) : new Date();
      return infractionDate >= start && infractionDate <= end;
    });

    return { suggested_driver_id: match ? match.driver_id : null };
  }
}

/** `POST /api/facilities/fines/:id/indicate` — ato humano, nunca automático (nível approve). */
export class IndicateFineDriverUseCase extends UseCase<{ id: number; identified_driver_id: number; indicated_at: string; protocol_number?: string; indicatedBy: number }, any> {
  constructor(private readonly fineRepository: FineRepository) {
    super();
  }

  /** @throws {BusinessRuleError} Se `indication_status` já `expired_nic`. */
  async execute(input: { id: number; identified_driver_id: number; indicated_at: string; protocol_number?: string; indicatedBy: number }) {
    const fine = await this.fineRepository.findById(input.id);
    if (!fine) throw new NotFoundError('Multa não encontrada.');

    const synced = await syncExpiredIndication(this.fineRepository, fine);
    if (synced.indication_status === 'expired_nic') {
      throw new BusinessRuleError('Prazo de indicação já expirou — indicação não pode mais ser confirmada como tempestiva.', { rule: 'E1' });
    }

    return this.fineRepository.update(input.id, {
      identified_driver_id: input.identified_driver_id,
      indicated_at: input.indicated_at,
      indication_status: 'indicated',
      notes: input.protocol_number ? `Protocolo: ${input.protocol_number}` : fine.notes,
    });
  }
}

/** `POST /api/facilities/fines/:id/appeal` */
export class AppealFineUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly fineRepository: FineRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const fine = await this.fineRepository.findById(id);
    if (!fine) throw new NotFoundError('Multa não encontrada.');
    return this.fineRepository.update(id, { status: 'appealed' });
  }
}

/** `POST /api/facilities/fines/:id/pay` — gera título em accounts_payable (nível approve, RF-FAC-034/058). */
export class PayFineUseCase extends UseCase<{ id: number; payment_date: string; cost_center_id?: number }, any> {
  constructor(private readonly fineRepository: FineRepository, private readonly accountPayableService: AccountPayableService) {
    super();
  }

  async execute(input: { id: number; payment_date: string; cost_center_id?: number }) {
    const fine = await this.fineRepository.findById(input.id);
    if (!fine) throw new NotFoundError('Multa não encontrada.');

    const payable = await this.accountPayableService.create({
      description: `Multa ${fine.infraction_code ?? fine.id}`,
      amount: fine.amount,
      due_date: input.payment_date,
      category: 'Frota',
      cost_center_id: input.cost_center_id ?? null,
    });

    return this.fineRepository.update(input.id, { status: 'paid', accounts_payable_id: payable.id });
  }
}

/** `POST /api/facilities/fines/:id/charge-driver` — vínculo RH/Financeiro informativo. */
export class ChargeDriverFineUseCase extends UseCase<{ id: number; financial_ref: string }, any> {
  constructor(private readonly fineRepository: FineRepository) {
    super();
  }

  async execute({ id, financial_ref }: { id: number; financial_ref: string }) {
    const fine = await this.fineRepository.findById(id);
    if (!fine) throw new NotFoundError('Multa não encontrada.');
    return this.fineRepository.update(id, { charge_to_driver: true, financial_ref });
  }
}
