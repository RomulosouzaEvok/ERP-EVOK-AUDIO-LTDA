/**
 * `POST /api/jur/contracts/:id/approve` — registra 1 aprovação de alçada de
 * contrato por valor (RF-JUR-003, decisão do dono do produto em
 * 2026-08-08). A rota é protegida por
 * `authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])` —
 * a AUTORIZAÇÃO real vem do RBAC (o controller resolve
 * `availableRoles` a partir de `req.user.permissions`, nunca do body).
 * `desiredRole` (opcional, vindo do body) serve só para DESAMBIGUAR quando
 * o aprovador tem os dois perfis simultaneamente — nunca concede um papel
 * que o usuário não tenha.
 *
 * ## Remediação FIND-ERP-005 (SanaCore, caso ERP-LEGACY-001-CASE-002)
 *
 * - **Falha 2** — a rota passou a exigir `requiredLevel: 'approve'`
 *   (`juridico.ts`), e `resolveAvailableApproverRoles` passou a comparar o
 *   nível de forma estrita (`=== 'approve'`) em vez de truthiness.
 * - **Falha 1** — os papéis exigidos vêm da política configurável
 *   (`jur_approval_thresholds`), não mais de literais de código.
 * - **Falha 3** — a aprovação grava `approved_value` (o valor que estava
 *   sendo aprovado), para que um aditivo posterior não a herde.
 * - **Falha 4** — segregação de identidade (D-K, `APR-2026-021` B.5): a
 *   mesma pessoa não registra as duas aprovações, e quem criou o contrato
 *   não o aprova. `admin` não é exceção.
 *
 * @module modules/juridico/application/use-cases/contract/ApproveContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import ContractApprovalRepository from '../../../domain/repositories/ContractApprovalRepository';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../../errors';
import ApprovalThresholdRepository from '../../../domain/repositories/ApprovalThresholdRepository';
import { type ContractApproverRole } from '../../../domain/constants';
import { resolveContractApprovalPolicy } from '../../../domain/approvalPolicy';
import {
  assertApproverIsNotPriorApprover,
  assertApproverIsNotRequester,
  SEGREGATION_RULES,
} from '../../../../../shared/domain/segregationOfDuties';

/**
 * ⚠️ Interface **LOCAL** (sem `export`) — correção de bug de RUNTIME
 * encontrada em 2026-08-09 durante o Bloco 6 RH, não relacionada ao
 * Jurídico em si: este arquivo usa `export =` e o transpilador CJS/ESM do
 * runtime (tsx/esbuild) aborta em tempo de EXECUÇÃO quando um `export =`
 * convive com qualquer outro `export`, inclusive um `export interface`
 * (`ReferenceError: ApproveContractUseCase_module is not defined`). Como
 * `contractController` é carregado no boot de `app.ts`, isso derrubava o
 * **servidor inteiro** — e nem `tsc --noEmit` nem a suíte unitária (Jest
 * em CJS) acusavam. `ApproveContractInput` não era importado por nenhum
 * outro arquivo, então tornar a interface local não muda nada além disso.
 */
interface ApproveContractInput {
  contractId: number;
  approverUserId: number;
  /** Papéis que o usuário logado efetivamente possui (resolvidos por RBAC no controller, nunca do body). */
  availableRoles: ContractApproverRole[];
  /** Opcional — só para desambiguar quando `availableRoles.length > 1`. */
  desiredRole?: ContractApproverRole | null;
}

class ApproveContractUseCase extends UseCase<ApproveContractInput, any> {
  private readonly repository: ContractRepository;
  private readonly approvalRepository: ContractApprovalRepository;
  private readonly thresholdRepository: ApprovalThresholdRepository;

  /**
   * `thresholdRepository` e `approvalRepository` sao OBRIGATORIOS
   * (FIND-ERP-005 R5 — fail-closed): sem eles nao ha politica de alcada nem
   * verificacao de segregacao, e a operacao nao deve simplesmente prosseguir.
   */
  public constructor(
    repository: ContractRepository,
    approvalRepository: ContractApprovalRepository,
    thresholdRepository: ApprovalThresholdRepository,
  ) {
    super();
    this.repository = repository;
    this.approvalRepository = approvalRepository;
    this.thresholdRepository = thresholdRepository;
  }

  /**
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {ValidationError} Usuário tem mais de um papel disponível e não informou `desiredRole` para desambiguar (400).
   * @throws {BusinessRuleError} Papel não disponível ao usuário (403-like/422), contrato não exige aprovação deste papel para o valor atual, papel já aprovou este contrato (RF-JUR-003), política de alçada não configurada (fail-closed), ou violação de segregação D-K (`D-K-JURIDICO`).
   */
  public async execute(input: ApproveContractInput): Promise<any> {
    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    if (!input.availableRoles || input.availableRoles.length === 0) {
      throw new BusinessRuleError('Usuário não possui papel de aprovador (diretor/financeiro).', { rule: 'RF-JUR-003' });
    }

    let role: ContractApproverRole;
    if (input.desiredRole) {
      if (!input.availableRoles.includes(input.desiredRole)) {
        throw new BusinessRuleError(`Usuário não possui o papel "${input.desiredRole}".`, { rule: 'RF-JUR-003' });
      }
      role = input.desiredRole;
    } else if (input.availableRoles.length === 1) {
      role = input.availableRoles[0];
    } else {
      throw new ValidationError('Informe "role" (diretor ou financeiro) para desambiguar — usuário possui mais de um papel de aprovador.');
    }

    const policy = await resolveContractApprovalPolicy(this.thresholdRepository as any, contract);
    const required = policy.requiredRoles;
    if (!required.includes(role)) {
      throw new BusinessRuleError(
        `Este contrato (valor ${contract.value ?? 0}) não exige aprovação do papel "${role}".`,
        { rule: 'RF-JUR-003' },
      );
    }

    const existing = await this.approvalRepository.findByContractAndRole(input.contractId, role);
    if (existing) {
      throw new BusinessRuleError(`O papel "${role}" já aprovou este contrato.`, { rule: 'RF-JUR-003' });
    }

    // FIND-ERP-005 / Falha 4 (D-K aplicado ao Juridico, APR-2026-021 B.5).
    // Duas dimensoes de identidade, ambas verificadas ANTES de qualquer
    // escrita, e nenhuma delas isenta `admin`:
    const liveApprovals = await this.approvalRepository.listByContract(input.contractId);
    assertApproverIsNotPriorApprover({
      rule: SEGREGATION_RULES.JUR_CONTRACT_AUTHORITY,
      existingApprovals: liveApprovals,
      approverUserId: input.approverUserId,
      documentLabel: `o contrato ${contract.contract_number ?? input.contractId}`,
      approverHint: "outro usuario com nivel 'approve' no modulo 'diretor' ou 'financeiro'",
    });
    assertApproverIsNotRequester({
      rule: SEGREGATION_RULES.JUR_CONTRACT_AUTHORITY,
      requesterUserId: contract.created_by ?? null,
      approverUserId: input.approverUserId,
      documentLabel: `o contrato ${contract.contract_number ?? input.contractId}`,
      approverHint: "outro usuario com nivel 'approve' no modulo 'diretor' ou 'financeiro'",
    });

    return this.approvalRepository.create({
      contract_id: input.contractId,
      approver_user_id: input.approverUserId,
      approver_role: role,
      approved_at: new Date(),
      // FIND-ERP-005 / Falha 3: a aprovacao passa a ser vinculada ao VALOR
      // aprovado. Uma aprovacao dada para R$ 60.000 deixa de valer,
      // sozinha, para um contrato que virou R$ 5.000.000.
      approved_value: contract.value ?? null,
    });
  }
}

export = ApproveContractUseCase;
