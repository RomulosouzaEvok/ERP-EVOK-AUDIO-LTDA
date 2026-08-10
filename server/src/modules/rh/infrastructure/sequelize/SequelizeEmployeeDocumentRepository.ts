/**
 * Implementação Sequelize do repositório de `HrEmployeeDocument`.
 * @module modules/rh/infrastructure/sequelize/SequelizeEmployeeDocumentRepository
 */
import EmployeeDocumentRepository from '../../domain/repositories/EmployeeDocumentRepository';

const { HrEmployeeDocument }: any = require('../../../../models/index');

class SequelizeEmployeeDocumentRepository extends EmployeeDocumentRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.doc_type) where.doc_type = filters.doc_type;
    if (filters.expiring_in_days !== undefined) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + Number(filters.expiring_in_days));
      where.valid_until = { [Op.lte]: limitDate.toISOString().slice(0, 10), [Op.gte]: new Date().toISOString().slice(0, 10) };
    }
    return HrEmployeeDocument.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrEmployeeDocument.findByPk(id);
  }

  public async create(data: Record<string, unknown>) {
    return HrEmployeeDocument.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>) {
    const record = await HrEmployeeDocument.findByPk(id);
    if (!record) return null;
    await record.update(data);
    return record;
  }

  public async findValidAso(employeeId: number | string, docType: string, today: string) {
    const { Op } = require('sequelize');
    return HrEmployeeDocument.findOne({
      where: {
        employee_id: employeeId,
        doc_type: docType,
        aptitude_result: { [Op.in]: ['apto', 'apto_com_restricao'] },
        [Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }],
      },
      order: [['createdAt', 'DESC']],
    });
  }
}

export = SequelizeEmployeeDocumentRepository;
