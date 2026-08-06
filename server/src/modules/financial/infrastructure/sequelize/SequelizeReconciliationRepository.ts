import type { Transaction } from 'sequelize';

const { Op } = require('sequelize');
const ReconciliationRepository = require('../../domain/repositories/ReconciliationRepository');
const {
  BankStatement, BankStatementEntry, AccountPayable, AccountReceivable, User,
} = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `ReconciliationRepository`
 * (Conciliação Bancária v1 — importação OFX).
 */
class SequelizeReconciliationRepository extends ReconciliationRepository {
  /** @inheritdoc */
  async createStatement(data: Record<string, any>, transaction: Transaction) {
    return BankStatement.create(data, { transaction });
  }

  /** @inheritdoc */
  async findStatementById(id: number | string) {
    return BankStatement.findByPk(id);
  }

  /** @inheritdoc */
  async listStatements(pagination: { limit?: number; offset?: number } = {}) {
    const { count, rows } = await BankStatement.findAndCountAll({
      include: [{ model: User, as: 'importedBy', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });
    return { rows, count };
  }

  /** @inheritdoc */
  async findExistingFitids(fitids: string[]) {
    if (fitids.length === 0) return new Set<string>();
    const rows = await BankStatementEntry.findAll({
      where: { fitid: { [Op.in]: fitids } },
      attributes: ['fitid'],
      raw: true,
    });
    return new Set(rows.map((row: { fitid: string }) => row.fitid));
  }

  /** @inheritdoc */
  async bulkCreateEntries(entries: Array<Record<string, any>>, transaction: Transaction) {
    return BankStatementEntry.bulkCreate(entries, { transaction });
  }

  /** @inheritdoc */
  async listEntriesByStatement(statementId: number | string, filters: { status?: string } = {}) {
    const where: Record<string, any> = { statement_id: statementId };
    if (filters.status) where.status = filters.status;

    return BankStatementEntry.findAll({
      where,
      order: [['entry_date', 'ASC'], ['id', 'ASC']],
    });
  }

  /** @inheritdoc */
  async listPendingEntriesByStatement(statementId: number | string) {
    return BankStatementEntry.findAll({
      where: { statement_id: statementId, status: 'pending' },
      order: [['entry_date', 'ASC'], ['id', 'ASC']],
    });
  }

  /** @inheritdoc */
  async findEntryById(id: number | string) {
    return BankStatementEntry.findByPk(id);
  }

  /** @inheritdoc */
  async findEntryByIdForUpdate(id: number | string, transaction: Transaction) {
    return BankStatementEntry.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async updateEntry(id: number | string, data: Record<string, any>, transaction: Transaction) {
    const entry = await BankStatementEntry.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!entry) return null;
    await entry.update(data, { transaction });
    return entry;
  }

  /** @inheritdoc */
  async findPayableByIdForUpdate(id: number | string, transaction: Transaction) {
    return AccountPayable.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async findReceivableByIdForUpdate(id: number | string, transaction: Transaction) {
    return AccountReceivable.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async updatePayablePayment(id: number | string, data: Record<string, any>, transaction: Transaction) {
    const payable = await AccountPayable.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payable) return null;
    await payable.update(data, { transaction });
    return payable;
  }

  /** @inheritdoc */
  async updateReceivablePayment(id: number | string, data: Record<string, any>, transaction: Transaction) {
    const receivable = await AccountReceivable.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!receivable) return null;
    await receivable.update(data, { transaction });
    return receivable;
  }

  /** @inheritdoc */
  async listOpenPayablesByDueDateRange(dueDateFrom: string, dueDateTo: string) {
    return AccountPayable.findAll({
      where: {
        status: { [Op.in]: ['pending', 'partial', 'overdue'] },
        due_date: { [Op.between]: [dueDateFrom, dueDateTo] },
      },
      attributes: ['id', 'description', 'amount', 'amount_paid', 'due_date', 'status'],
      raw: true,
    });
  }

  /** @inheritdoc */
  async listOpenReceivablesByDueDateRange(dueDateFrom: string, dueDateTo: string) {
    return AccountReceivable.findAll({
      where: {
        status: { [Op.in]: ['pending', 'partial', 'overdue'] },
        due_date: { [Op.between]: [dueDateFrom, dueDateTo] },
      },
      attributes: ['id', 'amount', 'amount_paid', 'due_date', 'status', 'customer_id', 'installment'],
      raw: true,
    }).then((rows: any[]) => rows.map((row) => ({ ...row, description: `Parcela ${row.installment} — cliente #${row.customer_id}` })));
  }
}

module.exports = SequelizeReconciliationRepository;
