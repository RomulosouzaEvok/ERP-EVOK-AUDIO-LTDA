/**
 * Casos de uso de Reserva de Recursos (P2, sem UC formal dedicado —
 * RF-FAC-054 a 056), cobrindo `/api/facilities/resource-reservations`.
 *
 * @module modules/facilities/application/use-cases/reservation/ReservationUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError, ValidationError } from '../../../../../errors';
import ReservationRepository from '../../../domain/repositories/ReservationRepository';

/** `GET /api/facilities/resource-reservations` */
export class ListReservationsUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly reservationRepository: ReservationRepository) {
    super();
  }

  async execute({ resource_type, facility_area_id, asset_id, status, from, to, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.reservationRepository.list({ resource_type, facility_area_id, asset_id, status, from, to }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `GET /api/facilities/resource-reservations/:id` */
export class GetReservationByIdUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly reservationRepository: ReservationRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) throw new NotFoundError('Reserva não encontrada.');
    return reservation;
  }
}

/** `POST /api/facilities/resource-reservations` — rejeita sobreposição de intervalo (RF-FAC-055). */
export class CreateReservationUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly reservationRepository: ReservationRepository) {
    super();
  }

  /**
   * @throws {ValidationError} Se `resource_type`/recurso/intervalo inconsistentes.
   * @throws {ConflictError} Se o recurso já estiver reservado no intervalo (BR-FAC-014).
   */
  async execute(input: Record<string, any> & { reservedBy: number }) {
    const { resource_type, facility_area_id, asset_id, starts_at, ends_at } = input;

    if (resource_type === 'room' && (!facility_area_id || asset_id)) {
      throw new ValidationError('resource_type=room exige facility_area_id e não aceita asset_id.');
    }
    if (resource_type === 'equipment' && (!asset_id || facility_area_id)) {
      throw new ValidationError('resource_type=equipment exige asset_id e não aceita facility_area_id.');
    }
    if (!starts_at || !ends_at || new Date(ends_at) <= new Date(starts_at)) {
      throw new ValidationError('starts_at e ends_at são obrigatórios e ends_at deve ser posterior a starts_at.');
    }

    const conflicting = await this.reservationRepository.findOverlapping({
      facility_area_id: facility_area_id ?? null,
      asset_id: asset_id ?? null,
      starts_at: new Date(starts_at),
      ends_at: new Date(ends_at),
    });
    if (conflicting) {
      throw new ConflictError('O recurso já está reservado nesse intervalo.', { rule: 'BR-FAC-014', conflicting_reservation_id: conflicting.id });
    }

    return this.reservationRepository.create({
      resource_type,
      facility_area_id: facility_area_id ?? null,
      asset_id: asset_id ?? null,
      reserved_by: input.reservedBy,
      starts_at,
      ends_at,
      subject: input.subject ?? null,
      status: 'confirmed',
    });
  }
}

/** `POST /api/facilities/resource-reservations/:id/cancel` — libera o horário. */
export class CancelReservationUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly reservationRepository: ReservationRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) throw new NotFoundError('Reserva não encontrada.');
    return this.reservationRepository.update(id, { status: 'canceled' });
  }
}
