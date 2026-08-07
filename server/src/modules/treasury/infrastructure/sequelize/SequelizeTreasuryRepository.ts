import type { Transaction } from 'sequelize';

/**
 * Implementação Sequelize/PostgreSQL do {@link TreasuryRepository}.
 *
 * @module modules/treasury/infrastructure/sequelize/SequelizeTreasuryRepository
 */

const { Op } = require('sequelize');
const TreasuryRepository = require('../../domain/repositories/TreasuryRepository');
const { TreasuryBankAccount, TreasuryFinancialOperation, AccountPayable, AccountReceivable } = require('../../../../models/index');

class SequelizeTreasuryRepository extends TreasuryRepository {
  // ---- Contas Bancárias ----

  async listBankAccounts(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.account_type) where.account_type = filters.account_type;
    if (typeof filters.active === 'boolean') where.active = filters.active;

    const { count, rows } = await TreasuryBankAccount.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['bank_name', 'ASC'], ['id', 'ASC']],
    });

    return { rows, count };
  }

  async findBankAccountById(id: number) {
    return TreasuryBankAccount.findByPk(id);
  }

  async findBankAccountByAgencyAndNumber(agency: string, accountNumber: string) {
    return TreasuryBankAccount.findOne({ where: { agency, account_number: accountNumber } });
  }

  async createBankAccount(data: Record<string, unknown>) {
    return TreasuryBankAccount.create(data);
  }

  async updateBankAccount(id: number, data: Record<string, unknown>) {
    const account = await TreasuryBankAccount.findByPk(id);
    if (!account) return null;
    await account.update(data);
    return account;
  }

  async listActiveBankAccountsForCashPosition() {
    return TreasuryBankAccount.findAll({ where: { active: true }, order: [['account_type', 'ASC'], ['bank_name', 'ASC']] });
  }

  // ---- Operações Financeiras ----

  async listOperations(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.operation_type) where.operation_type = filters.operation_type;

    const { count, rows } = await TreasuryFinancialOperation.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['start_date', 'DESC'], ['id', 'DESC']],
    });

    return { rows, count };
  }

  async findOperationById(id: number) {
    return TreasuryFinancialOperation.findByPk(id);
  }

  async findOperationByIdForUpdate(id: number, transaction: Transaction) {
    return TreasuryFinancialOperation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  async findOperationByContractNumber(contractNumber: string) {
    return TreasuryFinancialOperation.findOne({ where: { contract_number: contractNumber } });
  }

  async createOperation(data: Record<string, unknown>) {
    return TreasuryFinancialOperation.create(data);
  }

  async updateOperation(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await TreasuryFinancialOperation.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return TreasuryFinancialOperation.findByPk(id, transaction ? { transaction } : undefined);
  }

  // ---- Posição de Caixa (relatório derivado) ----

  async getOpenPayablesAndReceivablesSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openWhere = { payment_date: { [Op.is]: null }, status: { [Op.ne]: 'canceled' } };

    const receivableRows = await AccountReceivable.findAll({ where: openWhere, attributes: ['amount', 'amount_paid', 'due_date'] });
    const payableRows = await AccountPayable.findAll({ where: openWhere, attributes: ['amount', 'amount_paid', 'due_date'] });

    let totalReceivable = 0;
    let overdueReceivable = 0;
    for (const row of receivableRows) {
      const outstanding = (Number(row.amount) || 0) - (Number(row.amount_paid) || 0);
      totalReceivable += outstanding;
      if (new Date(row.due_date) < today) overdueReceivable += outstanding;
    }

    let totalPayable = 0;
    let overduePayable = 0;
    for (const row of payableRows) {
      const outstanding = (Number(row.amount) || 0) - (Number(row.amount_paid) || 0);
      totalPayable += outstanding;
      if (new Date(row.due_date) < today) overduePayable += outstanding;
    }

    return { totalReceivable, totalPayable, overdueReceivable, overduePayable };
  }
}

export = SequelizeTreasuryRepository;
