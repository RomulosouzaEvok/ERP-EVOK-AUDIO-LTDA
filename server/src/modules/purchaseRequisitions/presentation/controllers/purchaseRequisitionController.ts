const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizePurchaseRequisitionRepository = require('../../infrastructure/sequelize/SequelizePurchaseRequisitionRepository');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
const CreatePurchaseRequisitionUseCase = require('../../application/use-cases/CreatePurchaseRequisitionUseCase');
const ListPurchaseRequisitionsUseCase = require('../../application/use-cases/ListPurchaseRequisitionsUseCase');
const GetPurchaseRequisitionByIdUseCase = require('../../application/use-cases/GetPurchaseRequisitionByIdUseCase');
const {
  createPurchaseRequisitionSchema,
  listPurchaseRequisitionQuerySchema,
  handleZodError,
} = require('../validators/purchaseRequisitionValidators');
const { ValidationError } = require('../../../../errors');

const requisitionRepository = new SequelizePurchaseRequisitionRepository();
const itemRepository = new SequelizeItemRepository();

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

