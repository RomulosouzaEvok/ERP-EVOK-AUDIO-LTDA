/**
 * `POST /api/jur/lgpd/data-subject-requests` - registra recepcao de
 * solicitacao de titular (RF-JUR-037, LGPD art. 18). `due_date` calculada
 * automaticamente (`received_at + 15 dias`, art. 19, II).
 *
 * `dpo_user_id` (Encarregado/DPO responsavel, RF-JUR-041): se o payload nao
 * trouxer o id explicitamente, o use case resolve o DPO ativo configurado;
 * se nao houver DPO ativo, falha de forma clara em vez de gravar o usuario
 * corrente como fallback silencioso.
 *
 * @module modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import LgpdDpoDesignationRepository from '../../../domain/repositories/LgpdDpoDesignationRepository';
import { ValidationError } from '../../../../../errors';
import type { CreateDataSubjectRequestInput, DataSubjectRequestType } from '../../../domain/entities/LgpdTypes';

const SequelizeLgpdDpoDesignationRepository = require('../../../infrastructure/sequelize/SequelizeLgpdDpoDesignationRepository');

const REQUEST_TYPES: DataSubjectRequestType[] = [
  'confirmation', 'access', 'correction', 'anonymization', 'deletion', 'portability', 'consent_revocation', 'info_sharing',
];

class CreateDataSubjectRequestUseCase extends UseCase<CreateDataSubjectRequestInput, any> {
  private readonly repository: LgpdRequestRepository;
  private readonly dpoDesignationRepository: LgpdDpoDesignationRepository;

  public constructor(
    repository: LgpdRequestRepository,
    dpoDesignationRepository: LgpdDpoDesignationRepository = new SequelizeLgpdDpoDesignationRepository(),
  ) {
    super();
    this.repository = repository;
    this.dpoDesignationRepository = dpoDesignationRepository;
  }

  private async resolveDpoUserId(input: CreateDataSubjectRequestInput): Promise<number> {
    const activeDesignation = await this.dpoDesignationRepository.findActive();
    if (!activeDesignation?.user_id) {
      throw new ValidationError('Nenhum DPO ativo configurado. Cadastre uma designacao formal antes de registrar a solicitacao.');
    }

    if (input.dpoUserId !== undefined && input.dpoUserId !== null && Number(input.dpoUserId) !== Number(activeDesignation.user_id)) {
      throw new ValidationError('dpoUserId deve corresponder ao DPO ativo configurado.');
    }

    return Number(activeDesignation.user_id);
  }

  /** @throws {ValidationError} `type` ausente/invalido (400). */
  public async execute(input: CreateDataSubjectRequestInput): Promise<any> {
    if (!input.type || !REQUEST_TYPES.includes(input.type)) {
      throw new ValidationError(`type deve ser um de: ${REQUEST_TYPES.join(', ')}.`);
    }

    const receivedAt = input.received_at ? new Date(input.received_at) : new Date();
    const dueDate = new Date(receivedAt);
    dueDate.setDate(dueDate.getDate() + 15);
    const dpoUserId = await this.resolveDpoUserId(input);

    return this.repository.create({
      request_type: input.type,
      requester_name: input.requester_name ?? 'Nao identificado',
      requester_document: input.requester_document ?? null,
      requester_email: input.requester_contact ?? input.requester_email ?? null,
      data_subject_category: input.subject_category ?? null,
      received_at: receivedAt,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'received',
      dpo_user_id: dpoUserId,
    });
  }
}

export = CreateDataSubjectRequestUseCase;
