/**
 * Casos de uso de Correspondência (RF-FAC-048).
 *
 * @module modules/facilities/application/use-cases/correspondence/CorrespondenceUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import CorrespondenceRepository from '../../../domain/repositories/CorrespondenceRepository';

/** `GET /api/facilities/correspondences` */
export class ListCorrespondenceUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly correspondenceRepository: CorrespondenceRepository) {
    super();
  }

  async execute({ delivered, recipient_employee_id, recipient_department_id, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.correspondenceRepository.list({ delivered, recipient_employee_id, recipient_department_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `POST /api/facilities/correspondences` — registra recebimento. */
export class CreateCorrespondenceUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly correspondenceRepository: CorrespondenceRepository) {
    super();
  }

  /** @throws {ValidationError} Se nem `recipient_employee_id` nem `recipient_department_id` informados. */
  async execute(input: Record<string, any>) {
    if (!input.recipient_employee_id && !input.recipient_department_id) {
      throw new ValidationError('Ao menos um destinatário (recipient_employee_id ou recipient_department_id) é obrigatório.');
    }

    return this.correspondenceRepository.create({
      received_at: input.received_at ?? new Date(),
      sender: input.sender ?? null,
      recipient_employee_id: input.recipient_employee_id ?? null,
      recipient_department_id: input.recipient_department_id ?? null,
      type: input.type ?? 'other',
      notes: input.notes ?? null,
    });
  }
}

/** `POST /api/facilities/correspondences/:id/deliver` — registra entrega. */
export class DeliverCorrespondenceUseCase extends UseCase<{ id: number; delivered_to: string }, any> {
  constructor(private readonly correspondenceRepository: CorrespondenceRepository) {
    super();
  }

  async execute({ id, delivered_to }: { id: number; delivered_to: string }) {
    const correspondence = await this.correspondenceRepository.findById(id);
    if (!correspondence) throw new NotFoundError('Correspondência não encontrada.');
    return this.correspondenceRepository.update(id, { delivered_at: new Date(), delivered_to });
  }
}
