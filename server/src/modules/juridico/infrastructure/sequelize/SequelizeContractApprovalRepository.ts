/**
 * Implementação Sequelize do repositório de `JurContractApproval`
 * (RF-JUR-003).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeContractApprovalRepository
 */

import ContractApprovalRepository from '../../domain/repositories/ContractApprovalRepository';

const { JurContractApproval }: any = require('../../../../models/index');

class SequelizeContractApprovalRepository extends ContractApprovalRepository {
  /** Somente aprovações VIVAS (`invalidated_at IS NULL`) — FIND-ERP-005 Falha 3. */
  public async listByContract(contractId: number | string): Promise<any[]> {
    return JurContractApproval.findAll({
      where: { contract_id: contractId, invalidated_at: null },
      order: [['approved_at', 'ASC']],
    });
  }

  public async listAllByContract(contractId: number | string): Promise<any[]> {
    return JurContractApproval.findAll({ where: { contract_id: contractId }, order: [['approved_at', 'ASC']] });
  }

  public async findByContractAndRole(contractId: number | string, approverRole: string): Promise<any | null> {
    return JurContractApproval.findOne({
      where: { contract_id: contractId, approver_role: approverRole, invalidated_at: null },
    });
  }

  public async invalidateByContract(
    contractId: number | string,
    meta: { reason: string; addendumId?: number | null },
  ): Promise<number> {
    const [count] = await JurContractApproval.update(
      {
        invalidated_at: new Date(),
        invalidated_reason: meta.reason,
        invalidated_by_addendum_id: meta.addendumId ?? null,
      },
      { where: { contract_id: contractId, invalidated_at: null } },
    );
    return count;
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurContractApproval.create(data);
  }
}

export = SequelizeContractApprovalRepository;
