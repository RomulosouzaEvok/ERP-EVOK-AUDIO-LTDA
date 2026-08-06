import type { Transaction } from 'sequelize';

const { Op } = require('sequelize');
const CnabRepository = require('../../domain/repositories/CnabRepository');
const {
  CompanyBankingConfig, CnabRemittance, CnabRemittanceItem, CnabReturnFile, CnabReturnOccurrence,
  AccountReceivable, Client, User,
} = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `CnabRepository` (Cobrança
 * CNAB 240 v1 — remessa/retorno).
 *
 * @module modules/financial/infrastructure/sequelize/SequelizeCnabRepository
 */
class SequelizeCnabRepository extends CnabRepository {
  /** @inheritdoc */
  async findBankingConfig() {
    return CompanyBankingConfig.findByPk(1);
  }

  /** @inheritdoc */
  async findBankingConfigForUpdate(transaction: Transaction) {
    return CompanyBankingConfig.findByPk(1, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async createOrUpdateBankingConfig(data: Record<string, any>) {
    const existing = await CompanyBankingConfig.findByPk(1);
    if (existing) {
      await existing.update(data);
      return existing;
    }
    return CompanyBankingConfig.create({ id: 1, ...data });
  }

  /** @inheritdoc */
  async incrementBankingCounters(id: number | string, data: Record<string, any>, transaction: Transaction) {
    await CompanyBankingConfig.update(data, { where: { id }, transaction });
  }

  /** @inheritdoc */
  async findReceivablesByIds(ids: Array<number | string>, transaction?: Transaction) {
    if (ids.length === 0) return [];
    return AccountReceivable.findAll({
      where: { id: { [Op.in]: ids } },
      include: [{ model: Client, as: 'customer' }],
      transaction,
    });
  }

  /** @inheritdoc */
  async findOpenRemittanceItemsByReceivableIds(receivableIds: Array<number | string>) {
    if (receivableIds.length === 0) return [];
    return CnabRemittanceItem.findAll({
      where: { receivable_id: { [Op.in]: receivableIds }, status: 'pending' },
    });
  }

  /** @inheritdoc */
  async createRemittance(data: Record<string, any>, transaction: Transaction) {
    return CnabRemittance.create(data, { transaction });
  }

  /** @inheritdoc */
  async createRemittanceItems(items: Array<Record<string, any>>, transaction: Transaction) {
    return CnabRemittanceItem.bulkCreate(items, { transaction });
  }

  /** @inheritdoc */
  async findRemittanceById(id: number | string) {
    return CnabRemittance.findByPk(id, {
      include: [
        { model: User, as: 'generatedBy', attributes: ['id', 'name'] },
        { model: CnabRemittanceItem, as: 'items' },
      ],
    });
  }

  /** @inheritdoc */
  async listRemittances(pagination: { limit?: number; offset?: number } = {}) {
    const { count, rows } = await CnabRemittance.findAndCountAll({
      attributes: { exclude: ['file_content'] },
      include: [{ model: User, as: 'generatedBy', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });
    return { rows, count };
  }

  /** @inheritdoc */
  async createReturnFile(data: Record<string, any>, transaction: Transaction) {
    return CnabReturnFile.create(data, { transaction });
  }

  /** @inheritdoc */
  async updateReturnFile(id: number | string, data: Record<string, any>, transaction: Transaction) {
    const returnFile = await CnabReturnFile.findByPk(id, { transaction });
    if (!returnFile) return null;
    await returnFile.update(data, { transaction });
    return returnFile;
  }

  /** @inheritdoc */
  async createReturnOccurrence(data: Record<string, any>, transaction: Transaction) {
    return CnabReturnOccurrence.create(data, { transaction });
  }

  /** @inheritdoc */
  async findExistingOccurrence(where: { remittance_item_id: number | string; movement_code: string; occurrence_date: string | null; amount_paid: number }) {
    return CnabReturnOccurrence.findOne({
      where: {
        remittance_item_id: where.remittance_item_id,
        movement_code: where.movement_code,
        occurrence_date: where.occurrence_date,
        amount_paid: where.amount_paid,
      },
    });
  }

  /** @inheritdoc */
  async findRemittanceItemByNossoNumero(nossoNumero: string, transaction?: Transaction) {
    return CnabRemittanceItem.findOne({ where: { nosso_numero: nossoNumero }, transaction });
  }

  /** @inheritdoc */
  async findRemittanceItemByNossoNumeroForUpdate(nossoNumero: string, transaction: Transaction) {
    return CnabRemittanceItem.findOne({
      where: { nosso_numero: nossoNumero },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  /** @inheritdoc */
  async updateRemittanceItem(id: number | string, data: Record<string, any>, transaction: Transaction) {
    const item = await CnabRemittanceItem.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!item) return null;
    await item.update(data, { transaction });
    return item;
  }

  /** @inheritdoc */
  async findReceivableByIdForUpdate(id: number | string, transaction: Transaction) {
    return AccountReceivable.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async updateReceivablePayment(id: number | string, data: Record<string, any>, transaction: Transaction) {
    const receivable = await AccountReceivable.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!receivable) return null;
    await receivable.update(data, { transaction });
    return receivable;
  }

  /** @inheritdoc */
  async listReturnFiles(pagination: { limit?: number; offset?: number } = {}) {
    const { count, rows } = await CnabReturnFile.findAndCountAll({
      include: [{ model: User, as: 'processedBy', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });
    return { rows, count };
  }

  /** @inheritdoc */
  async listOccurrencesByReturnFile(returnFileId: number | string) {
    return CnabReturnOccurrence.findAll({
      where: { return_file_id: returnFileId },
      order: [['id', 'ASC']],
    });
  }
}

module.exports = SequelizeCnabRepository;
