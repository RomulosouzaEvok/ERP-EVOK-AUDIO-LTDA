/**
 * `GET /api/jur/contracts/:id/approvals` — situação da alçada de aprovação
 * de um contrato (RF-JUR-003).
 *
 * Existe para a tela conseguir exibir quais papéis já aprovaram e quais
 * faltam **sem efeito colateral**: antes deste use case, o client só
 * descobria o estado tentando `POST /approve` (que grava uma aprovação de
 * verdade) ou `POST /activate` (que ativaria o contrato se a alçada já
 * estivesse satisfeita), e por isso mostrava todo papel como pendente ao
 * abrir o contrato.
 *
 * @module modules/juridico/application/use-cases/contract/ListContractApprovalsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import ContractApprovalRepository from '../../../domain/repositories/ContractApprovalRepository';
import { NotFoundError } from '../../../../../errors';
import { requiredApproverRoles, type ContractApproverRole } from '../../../domain/constants';

interface ListContractApprovalsInput {
  contractId: number;
}

interface ListContractApprovalsOutput {
  /** Papéis exigidos pela faixa de valor do contrato (vazio = sem alçada extra). */
  required_roles: ContractApproverRole[];
  /** Aprovações já registradas. */
  approvals: any[];
  /** Papéis exigidos que ainda não aprovaram. */
  missing_roles: ContractApproverRole[];
  /** `true` quando a alçada está satisfeita (inclui o caso de não haver alçada). */
  approval_complete: boolean;
}

class ListContractApprovalsUseCase extends UseCase<ListContractApprovalsInput, ListContractApprovalsOutput> {
  private readonly repository: ContractRepository;
  private readonly approvalRepository: ContractApprovalRepository;

  public constructor(repository: ContractRepository, approvalRepository: ContractApprovalRepository) {
    super();
    this.repository = repository;
    this.approvalRepository = approvalRepository;
  }

  /**
   * @throws {NotFoundError} Contrato não encontrado (404).
   */
  public async execute(input: ListContractApprovalsInput): Promise<ListContractApprovalsOutput> {
    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    const requiredRoles = requiredApproverRoles(contract.value);
    const approvals = await this.approvalRepository.listByContract(input.contractId);
    const approvedRoles = new Set(approvals.map((approval: any) => approval.approver_role));
    const missingRoles = requiredRoles.filter((role) => !approvedRoles.has(role));

    return {
      required_roles: requiredRoles,
      approvals,
      missing_roles: missingRoles,
      approval_complete: missingRoles.length === 0,
    };
  }
}

export = ListContractApprovalsUseCase;
