const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizePurchaseRequisitionRepository = require('../../infrastructure/sequelize/SequelizePurchaseRequisitionRepository');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
const SequelizePurchaseRepository = require('../../../purchases/infrastructure/sequelize/SequelizePurchaseRepository');
const SequelizeItemSupplierRepository = require('../../../items/infrastructure/sequelize/SequelizeItemSupplierRepository');
const CreatePurchaseRequisitionUseCase = require('../../application/use-cases/CreatePurchaseRequisitionUseCase');
const ListPurchaseRequisitionsUseCase = require('../../application/use-cases/ListPurchaseRequisitionsUseCase');
const GetPurchaseRequisitionByIdUseCase = require('../../application/use-cases/GetPurchaseRequisitionByIdUseCase');
const ChangePurchaseRequisitionStatusUseCase = require('../../application/use-cases/ChangePurchaseRequisitionStatusUseCase');
const ConvertRequisitionToPurchaseOrdersUseCase = require('../../application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase');
const {
  createPurchaseRequisitionSchema,
  listPurchaseRequisitionQuerySchema,
  changePurchaseRequisitionStatusSchema,
  convertPurchaseRequisitionSchema,
  handleZodError,
} = require('../validators/purchaseRequisitionValidators');
const { ValidationError, ForbiddenError } = require('../../../../errors');

const requisitionRepository = new SequelizePurchaseRequisitionRepository();
const itemRepository = new SequelizeItemRepository();
const purchaseRepository = new SequelizePurchaseRepository();
const itemSupplierRepository = new SequelizeItemSupplierRepository();

async function rollbackIfPending(transaction) {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

exports.list = async (req, res, next) => {
  try {
    const query = listPurchaseRequisitionQuerySchema.parse(req.query);
    const useCase = new ListPurchaseRequisitionsUseCase(requisitionRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetPurchaseRequisitionByIdUseCase(requisitionRepository);
    const requisition = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = createPurchaseRequisitionSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreatePurchaseRequisitionUseCase(requisitionRepository, itemRepository);
    const requisition = await useCase.execute({
      ...parsed.data,
      requester_id: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'PurchaseRequisition',
      entityId: requisition?.id,
      entityDescription: requisition?.requisition_number,
      newValues: { status: requisition?.status, origin: requisition?.origin },
      description: `Requisicao de compra ${requisition?.requisition_number} criada`,
    });

    res.status(201).json({ success: true, data: requisition });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `PATCH /api/purchase-requisitions/:id/status` — transiciona o status da
 * requisicao (draft->pending|canceled, pending->approved|canceled). A
 * autorizacao de aprovacao e da ROTA, via
 * `authorizeModule('requisicoes', 'approve')` (admin global ou gestor da
 * area); o controller nao repete checagem por role.
 */
exports.changeStatus = async (req, res, next) => {
  try {
    const parsed = changePurchaseRequisitionStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    // Aprovar exige nivel gestor da area (ou admin global). As demais
    // transicoes (draft->pending, cancelamento) ficam no nivel operate da rota.
    const isApproval = parsed.data.status === 'approved';
    const isAdmin = req.user?.role === 'admin';
    const hasApproveLevel = req.user?.permissions?.requisicoes === 'approve';
    if (isApproval && !isAdmin && !hasApproveLevel) {
      throw new ForbiddenError('Aprovar requisicoes exige nivel gestor da area de requisicoes.');
    }

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository);
    const requisition = await useCase.execute({
      id: Number(req.params.id),
      status: parsed.data.status,
      userId: req.user.id,
    });

    logAction(req, {
      action: 'update_status',
      entityType: 'PurchaseRequisition',
      entityId: requisition?.id,
      entityDescription: requisition?.requisition_number,
      newValues: { status: requisition?.status },
      description: `Requisicao de compra ${requisition?.requisition_number} alterada para ${requisition?.status}`,
    });

    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/purchase-requisitions/:id/convert` — converte uma requisicao
 * de compra APROVADA em um ou mais pedidos de compra (um por fornecedor
 * resolvido), transacional com lock pessimista na requisicao.
 */
exports.convert = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = convertPurchaseRequisitionSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository,
      purchaseRepository,
      itemSupplierRepository,
    );
    const result = await useCase.execute({
      id: Number(req.params.id),
      fallback_supplier_id: parsed.data.fallback_supplier_id,
      notes: parsed.data.notes,
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'convert',
      entityType: 'PurchaseRequisition',
      entityId: result.requisition_id,
      newValues: { status: result.requisition_status, purchase_orders: result.purchase_orders.map((p) => p.order_number) },
      description: `Requisicao de compra ${result.requisition_id} convertida em ${result.purchase_orders.length} pedido(s) de compra`,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

