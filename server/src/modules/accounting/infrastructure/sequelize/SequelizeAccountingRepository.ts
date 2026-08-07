import type { Transaction } from 'sequelize';

/**
 * Implementação Sequelize/PostgreSQL do {@link AccountingRepository}.
 *
 * @module modules/accounting/infrastructure/sequelize/SequelizeAccountingRepository
 */

const { Op, QueryTypes } = require('sequelize');
const AccountingRepository = require('../../domain/repositories/AccountingRepository');
const { sequelize } = require('../../../../config/database');
const { AccountingChartOfAccount, AccountingEntry, AccountingEntryItem, CostCenter } = require('../../../../models/index');

class SequelizeAccountingRepository extends AccountingRepository {
  // ---- Plano de Contas ----

  async listAccounts(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.account_type) where.account_type = filters.account_type;
    if (typeof filters.active === 'boolean') where.active = filters.active;
    if (filters.parent_id !== undefined) where.parent_id = filters.parent_id;

    const { count, rows } = await AccountingChartOfAccount.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['code', 'ASC']],
    });

    return { rows, count };
  }

  async findAccountById(id: number, transaction?: Transaction) {
    return AccountingChartOfAccount.findByPk(id, transaction ? { transaction } : undefined);
  }

  async findAccountByCode(code: string) {
    return AccountingChartOfAccount.findOne({ where: { code } });
  }

  async createAccount(data: Record<string, unknown>) {
    return AccountingChartOfAccount.create(data);
  }

  async updateAccount(id: number, data: Record<string, unknown>) {
    const account = await AccountingChartOfAccount.findByPk(id);
    if (!account) return null;
    await account.update(data);
    return account;
  }

  // ---- Lançamentos Contábeis ----

  async countEntries(transaction?: Transaction) {
    return AccountingEntry.count(transaction ? { transaction } : undefined);
  }

  async listEntries(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.entry_type) where.entry_type = filters.entry_type;
    if (filters.date_from || filters.date_to) {
      where.entry_date = {};
      if (filters.date_from) where.entry_date[Op.gte] = filters.date_from;
      if (filters.date_to) where.entry_date[Op.lte] = filters.date_to;
    }

    const { count, rows } = await AccountingEntry.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['entry_date', 'DESC'], ['id', 'DESC']],
    });

    return { rows, count };
  }

  async findEntryById(id: number, transaction?: Transaction) {
    return AccountingEntry.findByPk(id, {
      include: [
        {
          model: AccountingEntryItem,
          as: 'items',
          include: [
            { model: AccountingChartOfAccount, as: 'account' },
            { model: CostCenter, as: 'costCenter' },
          ],
        },
      ],
      ...(transaction ? { transaction } : {}),
    });
  }

  async findEntryByIdForUpdate(id: number, transaction: Transaction) {
    return AccountingEntry.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  async createEntry(data: Record<string, unknown>, transaction?: Transaction) {
    return AccountingEntry.create(data, transaction ? { transaction } : undefined);
  }

  async updateEntry(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await AccountingEntry.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return AccountingEntry.findByPk(id, transaction ? { transaction } : undefined);
  }

  async createEntryItem(data: Record<string, unknown>, transaction?: Transaction) {
    return AccountingEntryItem.create(data, transaction ? { transaction } : undefined);
  }

  async findEntryItems(entryId: number, transaction?: Transaction) {
    return AccountingEntryItem.findAll({
      where: { entry_id: entryId },
      ...(transaction ? { transaction } : {}),
    });
  }

  async deleteEntryItems(entryId: number, transaction: Transaction) {
    await AccountingEntryItem.destroy({ where: { entry_id: entryId }, transaction });
  }

  // ---- Balancete (relatório derivado) ----

  async getTrialBalanceRows(year: number, month: number) {
    // `firstDayOfMonth` delimita saldo anterior (tudo lançado ANTES dele) de
    // movimento do mês (lançado DENTRO de [firstDayOfMonth, lastDayOfMonth]).
    // Só considera lançamentos `posted` — `draft` não afeta o razão contábil
    // ainda, e `reversed` já teve seu efeito neutralizado pelo lançamento de
    // estorno (também `posted`), então incluí-lo aqui não distorce o saldo.
    return sequelize.query(
      `SELECT coa.id                                                                    AS account_id,
              coa.code                                                                   AS code,
              coa.name                                                                   AS name,
              coa.account_type                                                           AS account_type,
              COALESCE(SUM(CASE WHEN ae.entry_date < :firstDayOfMonth THEN aei.debit ELSE 0 END), 0)::numeric  AS previous_debit,
              COALESCE(SUM(CASE WHEN ae.entry_date < :firstDayOfMonth THEN aei.credit ELSE 0 END), 0)::numeric AS previous_credit,
              COALESCE(SUM(CASE WHEN ae.entry_date >= :firstDayOfMonth AND ae.entry_date <= :lastDayOfMonth THEN aei.debit ELSE 0 END), 0)::numeric  AS debit_movement,
              COALESCE(SUM(CASE WHEN ae.entry_date >= :firstDayOfMonth AND ae.entry_date <= :lastDayOfMonth THEN aei.credit ELSE 0 END), 0)::numeric AS credit_movement
         FROM accounting_chart_of_accounts coa
         LEFT JOIN accounting_entry_items aei ON aei.account_id = coa.id
         LEFT JOIN accounting_entries ae ON ae.id = aei.entry_id AND ae.status = 'posted' AND ae.entry_date <= :lastDayOfMonth
        WHERE coa.accept_entries = true
        GROUP BY coa.id, coa.code, coa.name, coa.account_type
        ORDER BY coa.code ASC`,
      {
        replacements: {
          firstDayOfMonth: `${year}-${String(month).padStart(2, '0')}-01`,
          lastDayOfMonth: new Date(year, month, 0).toISOString().slice(0, 10),
        },
        type: QueryTypes.SELECT,
      },
    );
  }
}

export = SequelizeAccountingRepository;
