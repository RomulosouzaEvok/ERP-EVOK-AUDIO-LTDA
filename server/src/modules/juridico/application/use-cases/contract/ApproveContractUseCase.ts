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
 * @module modules/juridico/application/use-cases/contract/ApproveContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import ContractApprovalRepository from '../../../domain/repositories/ContractApprovalRepository';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../../errors';
import { requiredApproverRoles, type ContractApproverRole } from '../../../domain/constants';

export interface ApproveContractInput {
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

  public constructor(repository: ContractRepository, approvalRepository: ContractApprovalRepository) {
    super();
    this.repository = repository;
    this.approvalRepository = approvalRepository;
  }

  /**
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {ValidationError} Usuário tem mais de um papel disponível e não informou `desiredRole` para desambiguar (400).
   * @throws {BusinessRuleError} Papel não disponível ao usuário (403-like/422), contrato não exige aprovação deste papel para o valor atual, ou papel já aprovou este contrato (RF-JUR-003).
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

    const required = requiredApproverRoles(contract.value);
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

    return this.approvalRepository.create({
      contract_id: input.contractId,
      approver_user_id: input.approverUserId,
      approver_role: role,
      approved_at: new Date(),
    });
  }
}

export = ApproveContractUseCase;
