/**
 * `POST /api/jur/contracts/:id/activate` — transição para `active` (UC-52,
 * fluxo principal passo 5, RF-JUR-005).
 *
 * NOTA (pendência explícita, `docs/business/BLOCO_3_JUR_API.md` §2.7): a
 * checagem de alçada por valor/tipo (RF-JUR-003) depende de uma tabela de
 * configuração (`jur_approval_thresholds`) ainda não modelada neste bloco —
 * esta passada 1 NÃO bloqueia por alçada (todo `juridico:operate` pode
 * ativar); o parâmetro `approverHasApprove` é aceito para não quebrar o
 * contrato do controller quando a alçada for implementada na passada 2.
 *
 * @module modules/juridico/application/use-cases/contract/ActivateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../../errors';
import type { ActivateContractInput } from '../../../domain/entities/ContractTypes';

const CHECKLIST_REQUIRED_TYPES = ['employment', 'supplier', 'nda'];
const CHECKLIST_ITEMS = ['pi', 'confidentiality', 'non_compete'];

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

class ActivateContractUseCase extends UseCase<ActivateContractInput, any> {
  private readonly repository: ContractRepository;
  private readonly alertRepository: LegalAlertRepository;

  public constructor(repository: ContractRepository, alertRepository: LegalAlertRepository) {
    super();
    this.repository = repository;
    this.alertRepository = alertRepository;
  }

  /**
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {ValidationError} Contrato não está em `draft`/`in_approval` (400).
   * @throws {BusinessRuleError} Falta responsável (E1), assinatura (E3) ou checklist (RF-JUR-010) (422).
   */
  public async execute(input: ActivateContractInput): Promise<any> {
    const contract = await this.repository.findById(input.id);
    if (!contract) throw new NotFoundError(`Contrato ${input.id} não encontrado.`);

    if (!['draft', 'in_approval', 'approved'].includes(contract.status)) {
      throw new ValidationError('Contrato não está em draft/in_approval/approved — não pode ser ativado.');
    }

    const responsibleUserId = input.responsible_user_id ?? contract.responsible_user_id;
    if (!responsibleUserId) {
      throw new BusinessRuleError(
        'Não é possível ativar o contrato sem um gestor interno definido.',
        { field: 'responsible_user_id', rule: 'BR-JUR-001' },
      );
    }

    const partySignatories = await this.repository.countPartySignatories(input.id);
    const hasSignedDocument = await this.repository.hasSignedDocument(input.id);
    if (partySignatories < 2 || !hasSignedDocument) {
      throw new BusinessRuleError(
        'Ativação exige ao menos 2 signatários parte (party_a/party_b) e a versão assinada anexada.',
        { rule: 'BR-JUR-004' },
      );
    }

    if (CHECKLIST_REQUIRED_TYPES.includes(contract.contract_type)) {
      const checklist = contract.clause_checklist ?? {};
      const missing = CHECKLIST_ITEMS.some((item) => !checklist[item]);
      if (missing) {
        throw new BusinessRuleError(
          'Checklist de cláusulas (PI/confidencialidade/não concorrência) obrigatório para este tipo de contrato.',
          { rule: 'RF-JUR-010' },
        );
      }
    }

    await this.repository.update(input.id, {
      status: 'active',
      responsible_user_id: responsibleUserId,
      signed_at: contract.signed_at ?? new Date().toISOString().slice(0, 10),
    });

    // RF-JUR-005: alerta de vencimento se end_date definida.
    if (contract.end_date) {
      const dueDate = addDays(new Date(contract.end_date), -contract.alert_advance_days);
      await this.alertRepository.create({
        origin_type: 'contract',
        origin_id: contract.id,
        alert_subtype: 'expiration',
        due_date: dueDate,
        recipient_user_id: responsibleUserId,
        status: 'pending',
      });

      // RF-JUR-006: janela de denúncia (end_date - notice_days - 15 dias).
      if (contract.renewal_auto && contract.notice_days) {
        const noticeDueDate = addDays(new Date(contract.end_date), -(contract.notice_days + 15));
        await this.alertRepository.create({
          origin_type: 'contract',
          origin_id: contract.id,
          alert_subtype: 'renewal_notice',
          due_date: noticeDueDate,
          recipient_user_id: responsibleUserId,
          status: 'pending',
        });
      }
    }

    // RF-JUR-007: alerta de reajuste na data-base.
    if (contract.adjustment_index !== 'none' && contract.adjustment_base_date) {
      await this.alertRepository.create({
        origin_type: 'contract',
        origin_id: contract.id,
        alert_subtype: 'adjustment_index',
        due_date: contract.adjustment_base_date,
        recipient_user_id: responsibleUserId,
        status: 'pending',
      });
    }

    return this.repository.findById(input.id);
  }
}

export = ActivateContractUseCase;
