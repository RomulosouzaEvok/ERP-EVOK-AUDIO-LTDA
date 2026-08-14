/**
 * Contrato do repositório de `JurContractApproval` (alçada de aprovação de
 * contrato por valor — RF-JUR-003).
 *
 * @module modules/juridico/domain/repositories/ContractApprovalRepository
 */

class ContractApprovalRepository {
  /**
   * Lista os approvals **vivos** (não invalidados) de um contrato.
   *
   * FIND-ERP-005 / Falha 3: aprovações invalidadas por aditivo que elevou a
   * faixa continuam na tabela (histórico), mas não contam para a alçada.
   */
  public async listByContract(_contractId: number | string): Promise<any[]> {
    throw new Error('ContractApprovalRepository.listByContract não implementado.');
  }

  /** Lista TODOS os approvals, inclusive os invalidados — auditoria/histórico. */
  public async listAllByContract(_contractId: number | string): Promise<any[]> {
    throw new Error('ContractApprovalRepository.listAllByContract não implementado.');
  }

  /** Busca um approval vivo específico (papel já usado para este contrato — checagem de duplicidade). */
  public async findByContractAndRole(_contractId: number | string, _approverRole: string): Promise<any | null> {
    throw new Error('ContractApprovalRepository.findByContractAndRole não implementado.');
  }

  /**
   * Invalida (sem apagar) aprovações vivas de um contrato — usado quando um
   * aditivo eleva o valor e a alçada precisa ser reaberta (FIND-ERP-005 /
   * Falha 3, R3(a)(c)).
   *
   * @param _contractId - Contrato.
   * @param _meta - Motivo e, quando houver, o aditivo que causou a invalidação.
   * @returns Quantidade de aprovações invalidadas.
   */
  public async invalidateByContract(
    _contractId: number | string,
    _meta: { reason: string; addendumId?: number | null },
  ): Promise<number> {
    throw new Error('ContractApprovalRepository.invalidateByContract não implementado.');
  }

  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ContractApprovalRepository.create não implementado.');
  }
}

export = ContractApprovalRepository;
