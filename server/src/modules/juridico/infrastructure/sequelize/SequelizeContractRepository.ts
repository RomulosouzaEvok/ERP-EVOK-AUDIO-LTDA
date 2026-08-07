/**
 * Implementação Sequelize do repositório de `JurContract`/
 * `JurContractDocument`/`JurContractSignatory`/`JurContractAddendum`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeContractRepository
 */

import ContractRepository from '../../domain/repositories/ContractRepository';

const {
  JurContract,
  JurContractDocument,
  JurContractSignatory,
  JurContractAddendum,
}: any = require('../../../../models/index');

class SequelizeContractRepository extends ContractRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.type) where.contract_type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.supplier_id) where.supplier_id = filters.supplier_id;
    if (filters.client_id) where.client_id = filters.client_id;
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.responsible_user_id) where.responsible_user_id = filters.responsible_user_id;
    if (filters.vencendo_em_dias !== undefined) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + Number(filters.vencendo_em_dias));
      where.end_date = { [Op.lte]: limitDate.toISOString().slice(0, 10), [Op.gte]: new Date().toISOString().slice(0, 10) };
    }

    return JurContract.findAndCountAll({
      where,
      attributes: { exclude: ['counterparty_doc'] },
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurContract.findByPk(id, {
      include: [
        { model: JurContractDocument, as: 'documents' },
        { model: JurContractSignatory, as: 'signatories' },
        { model: JurContractAddendum, as: 'addendums' },
      ],
    });
  }

  public async countByYear(year: number): Promise<number> {
    const { Op } = require('sequelize');
    return JurContract.count({
      where: { createdAt: { [Op.gte]: new Date(`${year}-01-01T00:00:00Z`), [Op.lt]: new Date(`${year + 1}-01-01T00:00:00Z`) } },
    });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurContract.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const contract = await JurContract.findByPk(id);
    if (!contract) return null;
    await contract.update(data);
    return contract;
  }

  // ---- documentos ----
  public async addDocument(data: Record<string, unknown>): Promise<any> {
    return JurContractDocument.create(data);
  }
  public async listDocuments(contractId: number | string): Promise<any[]> {
    return JurContractDocument.findAll({ where: { contract_id: contractId }, order: [['version_number', 'ASC']] });
  }
  public async countDocuments(contractId: number | string): Promise<number> {
    return JurContractDocument.count({ where: { contract_id: contractId } });
  }
  public async hasSignedDocument(contractId: number | string): Promise<boolean> {
    const count = await JurContractDocument.count({ where: { contract_id: contractId, is_signed_version: true } });
    return count > 0;
  }

  // ---- signatários ----
  public async addSignatory(data: Record<string, unknown>): Promise<any> {
    return JurContractSignatory.create(data);
  }
  public async listSignatories(contractId: number | string): Promise<any[]> {
    return JurContractSignatory.findAll({ where: { contract_id: contractId } });
  }
  public async countPartySignatories(contractId: number | string): Promise<number> {
    const { Op } = require('sequelize');
    return JurContractSignatory.count({ where: { contract_id: contractId, signatory_role: { [Op.in]: ['party_a', 'party_b'] } } });
  }

  // ---- aditivos ----
  public async addAddendum(data: Record<string, unknown>): Promise<any> {
    return JurContractAddendum.create(data);
  }
  public async listAddendums(contractId: number | string): Promise<any[]> {
    return JurContractAddendum.findAll({ where: { contract_id: contractId }, order: [['addendum_number', 'ASC']] });
  }
  public async countAddendums(contractId: number | string): Promise<number> {
    return JurContractAddendum.count({ where: { contract_id: contractId } });
  }

  // ---- fichas cruzadas (RF-JUR-045, §8.3) ----
  private static readonly CROSS_REFERENCE_ATTRIBUTES = ['id', 'contract_number', 'contract_type', 'status', 'value', 'start_date', 'end_date'];

  public async listBySupplier(supplierId: number | string): Promise<any[]> {
    return JurContract.findAll({ where: { supplier_id: supplierId }, attributes: SequelizeContractRepository.CROSS_REFERENCE_ATTRIBUTES, order: [['createdAt', 'DESC']] });
  }
  public async listByClient(clientId: number | string): Promise<any[]> {
    return JurContract.findAll({ where: { client_id: clientId }, attributes: SequelizeContractRepository.CROSS_REFERENCE_ATTRIBUTES, order: [['createdAt', 'DESC']] });
  }
  public async listByEmployee(employeeId: number | string): Promise<any[]> {
    return JurContract.findAll({ where: { employee_id: employeeId }, attributes: SequelizeContractRepository.CROSS_REFERENCE_ATTRIBUTES, order: [['createdAt', 'DESC']] });
  }
}

export = SequelizeContractRepository;
