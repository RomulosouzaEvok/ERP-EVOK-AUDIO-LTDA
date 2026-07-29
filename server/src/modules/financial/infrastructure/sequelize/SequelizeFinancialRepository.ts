const { Op } = require('sequelize');
const FinancialRepository = require('../../domain/repositories/FinancialRepository');
const { sequelize } = require('../../../../config/database');
const { AccountReceivable, AccountPayable, Client, Sale } = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `FinancialRepository`.
 *
 * Reutiliza os models Sequelize já existentes `AccountReceivable`,
 * `AccountPayable`, `Client` e `Sale` — nenhum model novo é criado por este
 * módulo. As queries reproduzem exatamente as do controller anterior
 * `server/src/controllers/financeController.ts`.
 */
class SequelizeFinancialRepository extends FinancialRepository {
  /** @inheritdoc */
  async listReceivables(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.customer_id) where.customer_id = filters.customer_id;
    if (filters.start_date || filters.end_date) {
      where.due_date = {};
      if (filters.start_date) where.due_date[Op.gte] = filters.start_date;
      if (filters.end_date) where.due_date[Op.lte] = filters.end_date;
    }

    const { count, rows } = await AccountReceivable.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: Sale, as: 'sale', attributes: ['id', 'total_amount', 'status'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['due_date', 'ASC']]
    });

    return { rows, count };
  }

  /** @inheritdoc */
  async findReceivableById(id) {
    return AccountReceivable.findByPk(id);
  }

  /** @inheritdoc */
  async listPayables(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.start_date || filters.end_date) {
      where.due_date = {};
      if (filters.start_date) where.due_date[Op.gte] = filters.start_date;
      if (filters.end_date) where.due_date[Op.lte] = filters.end_date;
    }

    const { count, rows } = await AccountPayable.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['due_date', 'ASC']]
    });

    return { rows, count };
  }

  /** @inheritdoc */
  async findPayableById(id) {
    return AccountPayable.findByPk(id);
  }

  /** @inheritdoc */
  async createPayable(data) {
    return AccountPayable.create(data);
  }

  /** @inheritdoc */
  async sumReceivableByStatus(start, end) {
    return AccountReceivable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'],
      raw: true
    });
  }

  /** @inheritdoc */
  async sumPayableByStatus(start, end) {
    return AccountPayable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'],
      raw: true
    });
  }
}

module.exports = SequelizeFinancialRepository;




