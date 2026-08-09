/**
 * Contrato do repositório de `JurContractApproval` (alçada de aprovação de
 * contrato por valor — RF-JUR-003).
 *
 * @module modules/juridico/domain/repositories/ContractApprovalRepository
 */

class ContractApprovalRepository {
  /** Lista os approvals já registrados para um contrato. */
  public async listByContract(_contractId: number | string): Promise<any[]> {
    throw new Error('ContractApprovalRepository.listByContract não implementado.');
  }

  /** Busca um approval específico (papel já usado para este contrato — checagem de duplicidade). */
  public async findByContractAndRole(_contractId: number | string, _approverRole: string): Promise<any | null> {
    throw new Error('ContractApprovalRepository.findByContractAndRole não implementado.');
  }

  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ContractApprovalRepository.create não implementado.');
  }
}

export = ContractApprovalRepository;
