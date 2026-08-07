/**
 * `POST /api/jur/lgpd/data-subject-requests` — registra recepção de
 * solicitação de titular (RF-JUR-037, LGPD art. 18). `due_date` calculada
 * automaticamente (`received_at + 15 dias`, art. 19, II).
 *
 * `dpo_user_id` (Encarregado/DPO responsável, RF-JUR-041): o contrato de API
 * não expõe cadastro formal de "quem é o DPO" (pendência explícita §10.2 do
 * handoff) — nesta passada, se não informado explicitamente no payload,
 * assume o usuário que registra a solicitação (`req.user.id`), documentado
 * como reconciliação de schema (`jur_lgpd_data_subject_requests.dpo_user_id`
 * é NOT NULL).
 *
 * @module modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import { ValidationError } from '../../../../../errors';
import type { CreateDataSubjectRequestInput, DataSubjectRequestType } from '../../../domain/entities/LgpdTypes';

const REQUEST_TYPES: DataSubjectRequestType[] = [
  'confirmation', 'access', 'correction', 'anonymization', 'deletion', 'portability', 'consent_revocation', 'info_sharing',
];

class CreateDataSubjectRequestUseCase extends UseCase<CreateDataSubjectRequestInput, any> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `type` ausente/inválido (400). */
  public async execute(input: CreateDataSubjectRequestInput): Promise<any> {
    if (!input.type || !REQUEST_TYPES.includes(input.type)) {
      throw new ValidationError(`type deve ser um de: ${REQUEST_TYPES.join(', ')}.`);
    }

    const receivedAt = input.received_at ? new Date(input.received_at) : new Date();
    const dueDate = new Date(receivedAt);
    dueDate.setDate(dueDate.getDate() + 15);

    return this.repository.create({
      request_type: input.type,
      requester_name: input.requester_name ?? 'Não identificado',
      requester_document: input.requester_document ?? null,
      requester_email: input.requester_contact ?? input.requester_email ?? null,
      data_subject_category: input.subject_category ?? null,
      received_at: receivedAt,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'received',
      dpo_user_id: input.dpoUserId,
    });
  }
}

export = CreateDataSubjectRequestUseCase;
