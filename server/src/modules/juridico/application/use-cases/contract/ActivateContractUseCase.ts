/**
 * `POST /api/jur/contracts/:id/activate` — transição para `active` (UC-52,
 * fluxo principal passo 5, RF-JUR-005).
 *
 * RF-JUR-003 (alçada de aprovação por valor, decisão do dono do produto em
 * 2026-08-08, IMPLEMENTADO): valor <= `JUR_APPROVAL_THRESHOLD_DIRECTOR`
 * (R$ 50.000) ativa direto, sem aprovação extra (comportamento já
 * existente, não alterado). Acima disso, exige aprovação(ões) prévias
 * registradas em `jur_contract_approvals`
 * (`ApproveContractUseCase`/`POST /api/jur/contracts/:id/approve`) — ver
 * ## Remediação FIND-ERP-005 (SanaCore, caso ERP-LEGACY-001-CASE-002)
 *
 * **Agravante transversal / R5 — fail-open eliminado.** Até 2026-08-14 o
 * gate inteiro era `if (requiredRoles.length > 0 && this.approvalRepository)`,
 * com `approvalRepository?` OPCIONAL no construtor: instanciado sem ele, a
 * alçada era calculada e descartada, sem erro, log ou aviso. Agora
 * `approvalRepository` e `thresholdRepository` são **obrigatórios** e a
 * ausência é erro de construção — a invariante deixou de depender do
 * chamador (ASVS V4.1.5).
 *
 * **Falha 1** — os limiares vêm de `jur_approval_thresholds` (política
 * configurável, `APR-2026-021` B.3), não de literais. A política vigente no
 * instante da ativação é gravada em `jur_contracts.approval_policy_snapshot`
 * (R1(d): auditável a posteriori).
 *
 * **Falha 3** — uma aprovação só cobre a ativação se o valor que ela aprovou
 * (`approved_value`) for compatível com o valor ATUAL do contrato.
 *
 * @module modules/juridico/application/use-cases/contract/ActivateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';
import ContractApprovalRepository from '../../../domain/repositories/ContractApprovalRepository';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../../errors';
import ApprovalThresholdRepository from '../../../domain/repositories/ApprovalThresholdRepository';
import { resolveContractApprovalPolicy } from '../../../domain/approvalPolicy';
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
  private readonly approvalRepository: ContractApprovalRepository;
  private readonly thresholdRepository: ApprovalThresholdRepository;

  /**
   * @param repository - Repositorio de contratos.
   * @param alertRepository - Repositorio de alertas juridicos.
   * @param approvalRepository - **Obrigatorio** (FIND-ERP-005 R5(a)): impoe a alcada.
   * @param thresholdRepository - **Obrigatorio**: politica configuravel de alcada.
   * @throws {Error} Quando qualquer uma das dependencias que impoem a alcada falta — fail-closed por construcao.
   */
  public constructor(
    repository: ContractRepository,
    alertRepository: LegalAlertRepository,
    approvalRepository: ContractApprovalRepository,
    thresholdRepository: ApprovalThresholdRepository,
  ) {
    super();
    if (!approvalRepository) {
      throw new Error(
        'ActivateContractUseCase: approvalRepository e obrigatorio — sem ele a alcada de valor (RF-JUR-003) '
        + 'seria pulada em silencio (FIND-ERP-005, agravante transversal / R5).',
      );
    }
    if (!thresholdRepository) {
      throw new Error(
        'ActivateContractUseCase: thresholdRepository e obrigatorio — sem ele nao ha politica de alcada '
        + 'configurada para consultar (FIND-ERP-005, Falha 1 / R5).',
      );
    }
    this.repository = repository;
    this.alertRepository = alertRepository;
    this.approvalRepository = approvalRepository;
    this.thresholdRepository = thresholdRepository;
  }

  /**
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {ValidationError} Contrato não está em `draft`/`in_approval` (400).
   * @throws {BusinessRuleError} Falta responsável (E1), assinatura (E3), checklist (RF-JUR-010) ou aprovação de alçada por valor (RF-JUR-003) (422).
   */
  public async execute(input: ActivateContractInput): Promise<any> {
    const contract = await this.repository.findById(input.id);
    if (!contract) throw new NotFoundError(`Contrato ${input.id} não encontrado.`);

    if (!['draft', 'in_approval', 'approved'].includes(contract.status)) {
      throw new ValidationError('Contrato não está em draft/in_approval/approved — não pode ser ativado.');
    }

    // RF-JUR-003: alçada de aprovação por valor, lida da política
    // configurável (`jur_approval_thresholds`). SEM `&& this.approvalRepository`:
    // as dependências são obrigatórias no construtor (FIND-ERP-005 R5).
    const policy = await resolveContractApprovalPolicy(this.thresholdRepository as any, contract);
    const requiredRoles = policy.requiredRoles;
    if (requiredRoles.length > 0) {
      const approvals = await this.approvalRepository.listByContract(input.id);
      // FIND-ERP-005 / Falha 3: aprovação só conta se cobrir o valor ATUAL.
      // `approved_value` nulo = aprovação legada, anterior à remediação
      // (tabela vazia em NÃO-PRODUÇÃO) — conta, por compatibilidade; toda
      // aprovação criada a partir daqui sempre grava o valor.
      const contractValue = Number(contract.value ?? 0);
      const covering = approvals.filter((approval: any) => {
        if (approval?.approved_value === null || approval?.approved_value === undefined) return true;
        return Number(approval.approved_value) >= contractValue;
      });
      const approvedRoles = new Set(covering.map((a: any) => a.approver_role));
      const missing = requiredRoles.filter((role) => !approvedRoles.has(role));
      if (missing.length > 0) {
        throw new BusinessRuleError(
          `Ativação exige aprovação de alçada por valor ainda pendente: ${missing.join(', ')}.`,
          { rule: 'RF-JUR-003', missingRoles: missing },
        );
      }
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
      // FIND-ERP-005 R1(d): qual alçada vigia no instante da ativação.
      approval_policy_snapshot: policy.snapshot,
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
