const { Op } = require('sequelize');
const PurchaseRequisitionRepository = require('../../domain/repositories/PurchaseRequisitionRepository');
const { PurchaseRequisition, PurchaseRequisitionItem, Item, User, Department, ProductionOrder, Supplier } = require('../../../../models/index');

class SequelizePurchaseRequisitionRepository extends PurchaseRequisitionRepository {
  async listRequisitions(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.origin) where.origin = filters.origin;
    if (filters.requester_id) where.requester_id = filters.requester_id;
    if (filters.start_date || filters.end_date) {
      where.request_date = {};
      if (filters.start_date) where.request_date[Op.gte] = filters.start_date;
      if (filters.end_date) where.request_date[Op.lte] = filters.end_date;
    }

    const { count, rows } = await PurchaseRequisition.findAndCountAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'email'], required: false },
        { model: Department, as: 'department', attributes: ['id', 'name', 'sigla'], required: false },
        { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number'], required: false },
        {
          model: PurchaseRequisitionItem,
          as: 'items',
          include: [
            { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] },
            { model: Supplier, as: 'suggestedSupplier', attributes: ['id', 'company_name'], required: false },
          ],
        },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });

    return { rows, count };
  }

  async findRequisitionById(id: number, transaction?: any) {
    return PurchaseRequisition.findByPk(id, {
      ...(transaction ? { transaction } : {}),
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'email'], required: false },
        { model: Department, as: 'department', attributes: ['id', 'name', 'sigla'], required: false },
        { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number'], required: false },
        {
          model: PurchaseRequisitionItem,
          as: 'items',
          include: [
            { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] },
            { model: Supplier, as: 'suggestedSupplier', attributes: ['id', 'company_name'], required: false },
          ],
        },
      ],
    });
  }

  async createRequisition(data: Record<string, unknown>, transaction?: any) {
    return PurchaseRequisition.create(data, transaction ? { transaction } : undefined);
  }

  async createRequisitionItem(data: Record<string, unknown>, transaction?: any) {
    return PurchaseRequisitionItem.create(data, transaction ? { transaction } : undefined);
  }
}

export = SequelizePurchaseRequisitionRepository;

