import type { Transaction } from 'sequelize';

const { Op, QueryTypes } = require('sequelize');
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
  async findReceivableById(id: number | string) {
    return AccountReceivable.findByPk(id);
  }

  /** @inheritdoc */
  async findReceivableByIdForUpdate(id: number | string, transaction: Transaction) {
    return AccountReceivable.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
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
  async findPayableById(id: number | string) {
    return AccountPayable.findByPk(id);
  }

  /** @inheritdoc */
  async findPayableByIdForUpdate(id: number | string, transaction: Transaction) {
    return AccountPayable.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
  }

  /** @inheritdoc */
  async createPayable(data: Record<string, any>) {
    return AccountPayable.create(data);
  }

  /** @inheritdoc */
  async updatePayableCostCenter(id: number | string, costCenterId: number | null) {
    const payable = await AccountPayable.findByPk(id);
    if (!payable) return null;
    await payable.update({ cost_center_id: costCenterId });
    return payable;
  }

  /** @inheritdoc */
  async updateReceivableCostCenter(id: number | string, costCenterId: number | null) {
    const receivable = await AccountReceivable.findByPk(id);
    if (!receivable) return null;
    await receivable.update({ cost_center_id: costCenterId });
    return receivable;
  }

  /** @inheritdoc */
  async sumReceivableByStatus(start: Date, end: Date) {
    return AccountReceivable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'],
      raw: true
    });
  }

  /** @inheritdoc */
  async sumPayableByStatus(start: Date, end: Date) {
    return AccountPayable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'],
      raw: true
    });
  }

  /** @inheritdoc */
  async getOpenTitlesForProjection(days: any) {
    // SQL raw parametrizado — `days` e sempre um inteiro ja validado pelo
    // Zod (7..90) antes de chegar aqui, nunca concatenado na query.
    // "Em aberto" = payment_date IS NULL e status != 'canceled' (mesmos
    // enums de AccountReceivable/AccountPayable: pending, partial, paid,
    // overdue, canceled — 'paid' nunca tem payment_date nulo na pratica,
    // mas o filtro por payment_date cobre o caso de forma robusta mesmo
    // assim).
    const receivableRows = await sequelize.query(
      `SELECT due_date, amount
       FROM accounts_receivable
       WHERE payment_date IS NULL
         AND status != 'canceled'
         AND due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + (:days || ' days')::interval)`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    const payableRows = await sequelize.query(
      `SELECT due_date, amount
       FROM accounts_payable
       WHERE payment_date IS NULL
         AND status != 'canceled'
         AND due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + (:days || ' days')::interval)`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    const [overdueReceivableRow] = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM accounts_receivable
       WHERE payment_date IS NULL
         AND status != 'canceled'
         AND due_date < CURRENT_DATE`,
      { type: QueryTypes.SELECT }
    );

    const [overduePayableRow] = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM accounts_payable
       WHERE payment_date IS NULL
         AND status != 'canceled'
         AND due_date < CURRENT_DATE`,
      { type: QueryTypes.SELECT }
    );

    return {
      receivableRows,
      payableRows,
      overdueReceivable: parseFloat(overdueReceivableRow?.total ?? 0),
      overduePayable: parseFloat(overduePayableRow?.total ?? 0)
    };
  }

  /**
   * Lista contas a pagar vinculadas a processo jurídico (`legal_case_id IS
   * NOT NULL`) — alimenta `GET /api/jur/reports/financeiro` (RF-JUR-018/020).
   *
   * @returns {Promise<Object[]>}
   */
  async listPayablesByLegalCase() {
    return AccountPayable.findAll({
      where: { legal_case_id: { [Op.ne]: null } },
      attributes: ['id', 'legal_case_id', 'legal_expense_type', 'amount', 'due_date', 'status', 'cost_center_id'],
      order: [['due_date', 'ASC']],
    });
  }
}

module.exports = SequelizeFinancialRepository;




