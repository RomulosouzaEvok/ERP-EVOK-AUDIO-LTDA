/**
 * Implementação Sequelize do repositório de `JurContractApproval`
 * (RF-JUR-003).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeContractApprovalRepository
 */

import ContractApprovalRepository from '../../domain/repositories/ContractApprovalRepository';

const { JurContractApproval }: any = require('../../../../models/index');

class SequelizeContractApprovalRepository extends ContractApprovalRepository {
  public async listByContract(contractId: number | string): Promise<any[]> {
    return JurContractApproval.findAll({ where: { contract_id: contractId }, order: [['approved_at', 'ASC']] });
  }

  public async findByContractAndRole(contractId: number | string, approverRole: string): Promise<any | null> {
    return JurContractApproval.findOne({ where: { contract_id: contractId, approver_role: approverRole } });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurContractApproval.create(data);
  }
}

export = SequelizeContractApprovalRepository;
