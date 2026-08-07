/**
 * `POST /api/jur/legal-cases/:caseId/deadlines` — cria prazo processual
 * (UC-54). `responsible_user_id` é obrigatório sem exceção, inclusive para
 * rascunho (RF-JUR-021) — bloqueio de maior prioridade de todo o módulo.
 * `due_date` é sempre informada manualmente — o sistema NUNCA calcula
 * (RF-JUR-023).
 *
 * @module modules/juridico/application/use-cases/deadline/CreateDeadlineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { CreateDeadlineInput } from '../../../domain/entities/DeadlineTypes';

class CreateDeadlineUseCase extends UseCase<CreateDeadlineInput, any> {
  private readonly repository: DeadlineRepository;
  private readonly legalCaseRepository: LegalCaseRepository;

  public constructor(repository: DeadlineRepository, legalCaseRepository: LegalCaseRepository) {
    super();
    this.repository = repository;
    this.legalCaseRepository = legalCaseRepository;
  }

  /**
   * @throws {ValidationError} `description`/`due_date` ausentes (400).
   * @throws {NotFoundError} Processo não encontrado (404).
   * @throws {BusinessRuleError} `responsible_user_id` ausente (422, E1 do UC-54, BR-JUR-010).
   */
  public async execute(input: CreateDeadlineInput): Promise<any> {
    if (!input.description || !input.due_date) {
      throw new ValidationError('description e due_date são obrigatórios.');
    }
    if (!input.responsible_user_id) {
      throw new BusinessRuleError(
        'Não é possível salvar o prazo processual sem um responsável nomeado.',
        { field: 'responsible_user_id', rule: 'BR-JUR-010' },
      );
    }

    const legalCase = await this.legalCaseRepository.findById(input.legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${input.legalCaseId} não encontrado.`);

    const isFatal = input.is_fatal ?? true;
    if (isFatal && !input.escalation_user_id) {
      throw new BusinessRuleError(
        'Prazo fatal exige escalation_user_id (destinatário da escalada automática em D-3).',
        { field: 'escalation_user_id', rule: 'BR-JUR-011' },
      );
    }

    const deadline = await this.repository.create({
      legal_case_id: input.legalCaseId,
      description: input.description,
      due_date: input.due_date,
      is_fatal: isFatal,
      responsible_user_id: input.responsible_user_id,
      backup_user_id: input.backup_user_id ?? null,
      escalation_user_id: input.escalation_user_id ?? null,
      status: 'pending',
      created_by: input.createdBy,
    });

    return { ...deadline.toJSON?.() ?? deadline, alerts_scheduled: isFatal ? ['D-7', 'D-3', 'D-1', 'D0'] : [] };
  }
}

export = CreateDeadlineUseCase;
