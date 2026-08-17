/**
 * `POST /api/jur/lgpd/data-subject-requests/:id/resolve` - registra
 * desfecho (RF-JUR-037).
 *
 * `deletion` / `anonymization` nao sao executados automaticamente: o
 * desfecho cria uma tarefa manual de revisao para o DPO e deixa o efeito
 * verificavel via `manual_review_task_id`.
 *
 * @module modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import LgpdManualTaskRepository from '../../../domain/repositories/LgpdManualTaskRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { ResolveDataSubjectRequestInput } from '../../../domain/entities/LgpdTypes';

const SequelizeLgpdManualTaskRepository = require('../../../infrastructure/sequelize/SequelizeLgpdManualTaskRepository');

class ResolveDataSubjectRequestUseCase extends UseCase<ResolveDataSubjectRequestInput, any> {
  private readonly repository: LgpdRequestRepository;
  private readonly manualTaskRepository: LgpdManualTaskRepository;

  public constructor(
    repository: LgpdRequestRepository,
    manualTaskRepository: LgpdManualTaskRepository = new SequelizeLgpdManualTaskRepository(),
  ) {
    super();
    this.repository = repository;
    this.manualTaskRepository = manualTaskRepository;
  }

  /**
   * @throws {ValidationError} `resolution_notes` ausente (400).
   * @throws {NotFoundError} Solicitacao nao encontrada (404).
   */
  public async execute(input: ResolveDataSubjectRequestInput): Promise<any> {
    if (!input.resolution_notes) throw new ValidationError('resolution_notes e obrigatorio.');

    const request = await this.repository.findById(input.id);
    if (!request) throw new NotFoundError(`Solicitacao ${input.id} nao encontrada.`);

    if (!request.identity_verified) {
      throw new BusinessRuleError(
        'Nao e possivel resolver a solicitacao sem identidade verificada (CHECK ck_jur_lgpd_dsr_in_progress_requires_verification).',
        { field: 'identity_verified', rule: 'BR-JUR-041' },
      );
    }

    let manualReviewTaskId: number | null = request.manual_review_task_id ?? null;
    if (request.request_type === 'deletion' || request.request_type === 'anonymization') {
      const task = await this.manualTaskRepository.create({
        task_type: request.request_type === 'deletion' ? 'deletion_review' : 'anonymization_review',
        status: 'open',
        data_subject_request_id: request.id,
        assigned_to_user_id: request.dpo_user_id,
        notes: `Revisao manual exigida para pedido de ${request.request_type}.`,
      });
      manualReviewTaskId = task.id;
    }

    return this.repository.update(input.id, {
      status: 'answered',
      resolution_notes: input.resolution_notes,
      answered_at: input.answered_at ? new Date(input.answered_at) : new Date(),
      manual_review_task_id: manualReviewTaskId,
    });
  }
}

export = ResolveDataSubjectRequestUseCase;
