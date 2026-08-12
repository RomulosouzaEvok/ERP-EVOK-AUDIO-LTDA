import type { Transaction } from 'sequelize';

/**
 * Implementação Sequelize/PostgreSQL do `TimeImportRepository` (Grupo 10 —
 * Frequência/Ponto, importação AEJ).
 *
 * @module modules/rh/infrastructure/sequelize/SequelizeTimeImportRepository
 */
import TimeImportRepository from '../../domain/repositories/TimeImportRepository';

const {
  HrTimeImportBatch, HrTimeImportItem, Employee, HrAbsence, User,
}: any = require('../../../../models/index');

class SequelizeTimeImportRepository extends TimeImportRepository {
  public async createBatch(data: Record<string, unknown>, transaction?: Transaction) {
    return HrTimeImportBatch.create(data, { transaction });
  }

  public async updateBatch(id: number | string, data: Record<string, unknown>, transaction?: Transaction) {
    const batch = await HrTimeImportBatch.findByPk(id, { transaction });
    if (!batch) return null;
    await batch.update(data, { transaction });
    return batch;
  }

  public async findBatchById(id: number | string, transaction?: Transaction) {
    return HrTimeImportBatch.findByPk(id, {
      transaction,
      include: [
        { model: User, as: 'importedBy', attributes: ['id', 'name'] },
        { model: User, as: 'confirmedBy', attributes: ['id', 'name'] },
        {
          model: HrTimeImportItem,
          as: 'items',
          include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'cpf'] }],
        },
      ],
    });
  }

  public async findBatchByIdForUpdate(id: number | string, transaction: Transaction) {
    return HrTimeImportBatch.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  public async findAndCountBatches(
    filters: { status?: string; competencia?: string },
    pagination: { limit: number; offset: number },
  ) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.competencia) {
      const [year, month] = filters.competencia.split('-').map(Number);
      const start = `${filters.competencia}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${filters.competencia}-${String(lastDay).padStart(2, '0')}`;
      where.competencia_inicio = { [Op.lte]: end };
      where.competencia_fim = { [Op.gte]: start };
    }

    return HrTimeImportBatch.findAndCountAll({
      where,
      include: [{ model: User, as: 'importedBy', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });
  }

  public async bulkCreateItems(items: Array<Record<string, unknown>>, transaction?: Transaction) {
    if (items.length === 0) return [];
    return HrTimeImportItem.bulkCreate(items, { transaction });
  }

  public async listItemsByBatch(batchId: number | string) {
    return HrTimeImportItem.findAll({
      where: { batch_id: batchId },
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'cpf'] }],
      order: [['work_date', 'ASC'], ['id', 'ASC']],
    });
  }

  public async listUnmatchedItemsByBatch(batchId: number | string, transaction?: Transaction) {
    const { Op } = require('sequelize');
    return HrTimeImportItem.findAll({
      where: { batch_id: batchId, employee_id: { [Op.is]: null } },
      order: [['work_date', 'ASC'], ['id', 'ASC']],
      transaction,
    });
  }

  public async findEmployeeIdsByCpf(cpfs: string[]) {
    if (cpfs.length === 0) return new Map<string, number>();
    const { Op } = require('sequelize');
    const rows = await Employee.findAll({
      where: { cpf: { [Op.in]: cpfs } },
      attributes: ['id', 'cpf'],
      raw: true,
    });
    return new Map<string, number>(rows.map((row: { cpf: string; id: number }) => [row.cpf, row.id]));
  }

  public async listConfirmedItemsByPeriod(
    competenciaInicio: string,
    competenciaFim: string,
    employeeId?: number | string,
  ) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {
      work_date: { [Op.between]: [competenciaInicio, competenciaFim] },
    };
    if (employeeId) where.employee_id = employeeId;

    return HrTimeImportItem.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name'] },
        {
          model: HrTimeImportBatch,
          as: 'batch',
          attributes: [],
          where: { status: 'confirmed' },
          required: true,
        },
      ],
      order: [['employee_id', 'ASC'], ['work_date', 'ASC']],
    });
  }

  public async listAbsencesOverlappingPeriod(
    competenciaInicio: string,
    competenciaFim: string,
    employeeId?: number | string,
  ) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {
      start_date: { [Op.lte]: competenciaFim },
      [Op.or]: [
        { actual_end_date: { [Op.is]: null } },
        { actual_end_date: { [Op.gte]: competenciaInicio } },
      ],
    };
    if (employeeId) where.employee_id = employeeId;

    return HrAbsence.findAll({
      where,
      attributes: ['id', 'employee_id', 'type', 'start_date', 'expected_end_date', 'actual_end_date'],
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }],
    });
  }
}

export = SequelizeTimeImportRepository;
