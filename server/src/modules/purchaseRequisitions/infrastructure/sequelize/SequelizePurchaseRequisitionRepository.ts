const { Op } = require('sequelize');
const PurchaseRequisitionRepository = require('../../domain/repositories/PurchaseRequisitionRepository');
const { PurchaseRequisition, PurchaseRequisitionItem, Item, User, Department, ProductionOrder, Supplier, EngineeringProject, Employee } = require('../../../../models/index');

class SequelizePurchaseRequisitionRepository extends PurchaseRequisitionRepository {
  async listRequisitions(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.origin) where.origin = filters.origin;
    if (filters.requester_id) where.requester_id = filters.requester_id;
    if (filters.department_id) where.department_id = filters.department_id;
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
        { model: EngineeringProject, as: 'engineeringProject', attributes: ['id', 'project_code', 'name'], required: false },
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
        { model: EngineeringProject, as: 'engineeringProject', attributes: ['id', 'project_code', 'name'], required: false },
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

  async findRequisitionByIdForUpdate(id: number, transaction: any) {
    // Sem `include` (LEFT OUTER JOIN) junto de `lock`: o Postgres rejeita
    // "FOR UPDATE" no lado nullable de um outer join. Trava requisicao e
    // itens em duas queries de tabela unica, sem join (mesmo padrao usado
    // em `SequelizePurchaseRepository.findPurchaseWithItemsForUpdate`).
    const requisition = await PurchaseRequisition.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!requisition) return null;

    const items = await PurchaseRequisitionItem.findAll({
      where: { requisition_id: id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // Dados do item mestre carregados sem lock (tabela items nao precisa de
    // trava aqui; apenas leitura de codigo/descricao para a conversao).
    const itemIds = [...new Set(items.map((row: any) => String(row.item_id)))];
    const masterItems = itemIds.length
      ? await Item.findAll({
        where: { id: itemIds },
        attributes: ['id', 'codigo', 'descricao'],
        transaction,
      })
      : [];
    const masterById = new Map<string, any>(masterItems.map((item: any) => [String(item.id), item]));
    for (const row of items) {
      (row as any).item = masterById.get(String(row.item_id)) ?? null;
      (row as any).dataValues.item = (row as any).item;
    }

    requisition.items = items;
    return requisition;
  }

  async createRequisition(data: Record<string, unknown>, transaction?: any) {
    return PurchaseRequisition.create(data, transaction ? { transaction } : undefined);
  }

  async createRequisitionItem(data: Record<string, unknown>, transaction?: any) {
    return PurchaseRequisitionItem.create(data, transaction ? { transaction } : undefined);
  }

  async updateRequisition(id: number, data: Record<string, unknown>, transaction?: any) {
    const requisition = await PurchaseRequisition.findByPk(id, transaction ? { transaction } : undefined);
    if (!requisition) return null;
    await requisition.update(data, transaction ? { transaction } : undefined);
    return this.findRequisitionById(id, transaction);
  }

  async updateRequisitionItem(id: number, data: Record<string, unknown>, transaction?: any) {
    await PurchaseRequisitionItem.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
  }

  async findEngineeringProjectById(id: number, transaction?: any) {
    return EngineeringProject.findByPk(id, { transaction });
  }

  async findEmployeeByUserId(userId: number, transaction?: any) {
    return Employee.findOne({
      where: { user_id: userId },
      attributes: ['id', 'department_id'],
      transaction,
    });
  }
}

export = SequelizePurchaseRequisitionRepository;

