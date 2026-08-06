import type { Transaction } from 'sequelize';

const { Op } = require('sequelize');
const RfqRepository = require('../../domain/repositories/RfqRepository');
const {
  Rfq, RfqItem, RfqSupplier, RfqQuote,
  User, Item, Supplier, PurchaseRequisition, PurchaseRequisitionItem,
} = require('../../../../models/index');

/**
 * Implementacao Sequelize do repositorio de Cotacao/RFQ multi-fornecedor.
 *
 * @module modules/rfq/infrastructure/sequelize/SequelizeRfqRepository
 */
class SequelizeRfqRepository extends RfqRepository {
  private detailIncludes() {
    return [
      { model: PurchaseRequisition, as: 'requisition', attributes: ['id', 'requisition_number'], required: false },
      { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
      {
        model: RfqItem,
        as: 'items',
        include: [
          { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] },
          { model: Supplier, as: 'awardedSupplier', attributes: ['id', 'company_name'], required: false },
          {
            model: RfqQuote,
            as: 'quotes',
            include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }],
          },
        ],
      },
      {
        model: RfqSupplier,
        as: 'suppliers',
        include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }],
      },
    ];
  }

  async listRfqs(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.requisition_id) where.requisition_id = filters.requisition_id;

    const { count, rows } = await Rfq.findAndCountAll({
      where,
      include: [
        { model: PurchaseRequisition, as: 'requisition', attributes: ['id', 'requisition_number'], required: false },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
        {
          model: RfqItem,
          as: 'items',
          include: [{ model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }],
        },
        {
          model: RfqSupplier,
          as: 'suppliers',
          include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }],
        },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return { rows, count };
  }

  async findRfqById(id: number, transaction?: Transaction) {
    return Rfq.findByPk(id, {
      ...(transaction ? { transaction } : {}),
      include: this.detailIncludes(),
    });
  }

  async findRfqByIdForUpdate(id: number, transaction: Transaction) {
    return Rfq.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  async countRfqsInYear(year: number, transaction?: Transaction) {
    return Rfq.count({
      where: { rfq_number: { [Op.like]: `RFQ-${year}-%` } },
      ...(transaction ? { transaction } : {}),
    });
  }

  async createRfq(data: Record<string, unknown>, transaction?: Transaction) {
    return Rfq.create(data, transaction ? { transaction } : undefined);
  }

  async updateRfq(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await Rfq.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return this.findRfqById(id, transaction);
  }

  async createRfqItem(data: Record<string, unknown>, transaction?: Transaction) {
    return RfqItem.create(data, transaction ? { transaction } : undefined);
  }

  async findRfqItems(rfqId: number, transaction?: Transaction) {
    return RfqItem.findAll({ where: { rfq_id: rfqId }, ...(transaction ? { transaction } : {}) });
  }

  async updateRfqItem(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await RfqItem.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
  }

  async findRfqSupplier(rfqId: number, supplierId: number, transaction?: Transaction) {
    return RfqSupplier.findOne({
      where: { rfq_id: rfqId, supplier_id: supplierId },
      ...(transaction ? { transaction } : {}),
    });
  }

  async findRfqSuppliers(rfqId: number, transaction?: Transaction) {
    return RfqSupplier.findAll({ where: { rfq_id: rfqId }, ...(transaction ? { transaction } : {}) });
  }

  async createRfqSupplier(data: Record<string, unknown>, transaction?: Transaction) {
    return RfqSupplier.create(data, transaction ? { transaction } : undefined);
  }

  async updateRfqSupplier(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await RfqSupplier.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return RfqSupplier.findByPk(id, transaction ? { transaction } : undefined);
  }

  async findRfqQuote(rfqItemId: number, supplierId: number, transaction?: Transaction) {
    return RfqQuote.findOne({
      where: { rfq_item_id: rfqItemId, supplier_id: supplierId },
      ...(transaction ? { transaction } : {}),
    });
  }

  async createRfqQuote(data: Record<string, unknown>, transaction?: Transaction) {
    return RfqQuote.create(data, transaction ? { transaction } : undefined);
  }

  async updateRfqQuote(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    await RfqQuote.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return RfqQuote.findByPk(id, transaction ? { transaction } : undefined);
  }

  async findQuotesByRfqId(rfqId: number, transaction?: Transaction) {
    return RfqQuote.findAll({
      include: [
        {
          model: RfqItem,
          as: 'rfqItem',
          where: { rfq_id: rfqId },
          attributes: ['id', 'item_id', 'quantity', 'unit'],
          required: true,
        },
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
      ],
      ...(transaction ? { transaction } : {}),
    });
  }

  async findRequisitionWithItems(requisitionId: number, transaction?: Transaction) {
    return PurchaseRequisition.findByPk(requisitionId, {
      include: [{ model: PurchaseRequisitionItem, as: 'items' }],
      ...(transaction ? { transaction } : {}),
    });
  }
}

export = SequelizeRfqRepository;
