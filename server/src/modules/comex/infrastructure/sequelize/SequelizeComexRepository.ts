import type { Transaction } from 'sequelize';

const ComexRepository = require('../../domain/repositories/ComexRepository');
const {
  ImportProcess, ImportProcessItem, User, Item, Supplier, LotControl,
} = require('../../../../models/index');

/**
 * Implementacao Sequelize do repositorio de Importacao/COMEX (UC-19).
 *
 * @module modules/comex/infrastructure/sequelize/SequelizeComexRepository
 */
class SequelizeComexRepository extends ComexRepository {
  private detailIncludes() {
    return [
      { model: Supplier, as: 'supplier', attributes: ['id', 'company_name', 'trade_name', 'cnpj'] },
      { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
      {
        model: ImportProcessItem,
        as: 'items',
        include: [{ model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao', 'unidade'] }],
      },
    ];
  }

  async listImportProcesses(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.supplier_id) where.supplier_id = filters.supplier_id;

    const { count, rows } = await ImportProcess.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name', 'trade_name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
        {
          model: ImportProcessItem,
          as: 'items',
          include: [{ model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }],
        },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return { rows, count };
  }

  async findImportProcessById(id: number, transaction?: Transaction) {
    return ImportProcess.findByPk(id, {
      ...(transaction ? { transaction } : {}),
      include: this.detailIncludes(),
    });
  }

  async findImportProcessByIdForUpdate(id: number, transaction: Transaction) {
    return ImportProcess.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  async countImportProcessesInYear(year: number, transaction?: Transaction) {
    const { Op } = require('sequelize');
    return ImportProcess.count({
      where: { process_number: { [Op.like]: `IMP-${year}-%` } },
      ...(transaction ? { transaction } : {}),
    });
  }

  async createImportProcess(data: Record<string, unknown>, transaction?: Transaction) {
    return ImportProcess.create(data, transaction ? { transaction } : undefined);
  }

  async updateImportProcess(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await ImportProcess.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return this.findImportProcessById(id, transaction);
  }

  async createImportProcessItem(data: Record<string, unknown>, transaction?: Transaction) {
    return ImportProcessItem.create(data, transaction ? { transaction } : undefined);
  }

  async findImportProcessItems(importProcessId: number, transaction?: Transaction, forUpdate?: boolean) {
    return ImportProcessItem.findAll({
      where: { import_process_id: importProcessId },
      ...(transaction ? { transaction } : {}),
      ...(forUpdate && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async updateImportProcessItem(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await ImportProcessItem.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
  }

  async findSupplierById(id: number, transaction?: Transaction) {
    return Supplier.findByPk(id, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  async findLotForReceipt(where: Record<string, unknown>, transaction: Transaction) {
    return LotControl.findOne({
      where,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  /** @inheritdoc */
  async createLot(data: Record<string, unknown>, transaction: Transaction) {
    return LotControl.create(data, { transaction });
  }
}

export = SequelizeComexRepository;
