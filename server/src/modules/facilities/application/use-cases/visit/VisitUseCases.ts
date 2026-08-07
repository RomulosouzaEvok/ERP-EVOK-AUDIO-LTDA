/**
 * Casos de uso de Visita (Check-in/Check-out — RF-FAC-044 a 046, UC-61).
 *
 * @module modules/facilities/application/use-cases/visit/VisitUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import VisitRepository from '../../../domain/repositories/VisitRepository';
import VisitorRepository from '../../../domain/repositories/VisitorRepository';

/** Horário-limite de permanência (horas), configurável via env (RF-FAC-046). */
const ONSITE_OVERDUE_HOURS = Number(process.env.FACILITIES_VISIT_OVERDUE_HOURS ?? 8);

/** `GET /api/facilities/visits` */
export class ListVisitsUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly visitRepository: VisitRepository) {
    super();
  }

  async execute({ status, host_employee_id, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.visitRepository.list({ status, host_employee_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `GET /api/facilities/visits/:id` */
export class GetVisitByIdUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly visitRepository: VisitRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const visit = await this.visitRepository.findById(id);
    if (!visit) throw new NotFoundError('Visita não encontrada.');
    return visit;
  }
}

/** `POST /api/facilities/visits` — check-in, cria/reaproveita visitante. */
export class CreateVisitUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly visitRepository: VisitRepository, private readonly visitorRepository: VisitorRepository) {
    super();
  }

  /** @throws {ValidationError} Se `visitor.name`, `visitor.document` ou `host_employee_id` ausentes (E2 do UC-61). */
  async execute(input: Record<string, any>) {
    const { visitor, host_employee_id } = input;
    if (!visitor?.name || !visitor?.document || !host_employee_id) {
      throw new ValidationError('visitor.name, visitor.document e host_employee_id são obrigatórios.');
    }

    let visitorRecord = await this.visitorRepository.findByDocument(visitor.document);
    if (!visitorRecord) {
      visitorRecord = await this.visitorRepository.create({
        name: visitor.name,
        document: visitor.document,
        company: visitor.company ?? null,
        phone: visitor.phone ?? null,
        photo_path: visitor.photo_path ?? null,
      });
    }

    return this.visitRepository.create({
      visitor_id: visitorRecord.id,
      host_employee_id,
      scheduled_at: input.scheduled_at ?? null,
      checkin_at: new Date(),
      badge_number: input.badge_number ?? null,
      purpose: input.purpose ?? null,
      areas_authorized: Array.isArray(input.areas_authorized) ? input.areas_authorized.join(',') : (input.areas_authorized ?? null),
      status: 'onsite',
    });
  }
}

/** `POST /api/facilities/visits/:id/checkout` — devolução de crachá. */
export class CheckoutVisitUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly visitRepository: VisitRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const visit = await this.visitRepository.findById(id);
    if (!visit) throw new NotFoundError('Visita não encontrada.');
    return this.visitRepository.update(id, { checkout_at: new Date(), status: 'completed' });
  }
}

/** `GET /api/facilities/visits/onsite-overdue` — dashboard, E1/RF-FAC-046. */
export class OnsiteOverdueVisitsUseCase extends UseCase<void, any[]> {
  constructor(private readonly visitRepository: VisitRepository) {
    super();
  }

  async execute() {
    const onsite = await this.visitRepository.listOnsite();
    const now = Date.now();

    return onsite.map((visit: any) => {
      const json = visit.toJSON ? visit.toJSON() : visit;
      const hoursOnsite = json.checkin_at ? (now - new Date(json.checkin_at).getTime()) / 3_600_000 : 0;
      return {
        id: json.id,
        visitor_id: json.visitor_id,
        visitor_name: json.visitor?.name,
        host_employee_id: json.host_employee_id,
        checkin_at: json.checkin_at,
        hours_onsite: Math.round(hoursOnsite * 10) / 10,
        overdue: hoursOnsite > ONSITE_OVERDUE_HOURS,
      };
    });
  }
}
