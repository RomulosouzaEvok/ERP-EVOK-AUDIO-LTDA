const SequelizeMrpRepository = require('../../infrastructure/sequelize/SequelizeMrpRepository');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
const SequelizeItemSupplierRepository = require('../../../items/infrastructure/sequelize/SequelizeItemSupplierRepository');
const SequelizePurchaseRequisitionRepository = require('../../../purchaseRequisitions/infrastructure/sequelize/SequelizePurchaseRequisitionRepository');
const SequelizeProductionOrderRepository = require('../../../production/infrastructure/sequelize/SequelizeProductionOrderRepository');
const GenerateMrpPlanUseCase = require('../../application/use-cases/GenerateMrpPlanUseCase');
const ListPlannedOrdersUseCase = require('../../application/use-cases/ListPlannedOrdersUseCase');
const ConvertPlannedOrdersToRequisitionUseCase = require('../../application/use-cases/ConvertPlannedOrdersToRequisitionUseCase');
const ConvertPlannedOrdersToProductionOrderUseCase = require('../../application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase');
const {
  createMrpPlanSchema,
  convertPlannedOrdersSchema,
  convertPlannedOrdersToProductionSchema,
} = require('../validators/mrpValidators');
const { ValidationError } = require('../../../../errors');
const { logAction } = require('../../../../services/auditLogService');

const mrpRepository = new SequelizeMrpRepository();
const itemRepository = new SequelizeItemRepository();
const itemSupplierRepository = new SequelizeItemSupplierRepository();
const requisitionRepository = new SequelizePurchaseRequisitionRepository();
const productionOrderRepository = new SequelizeProductionOrderRepository();

/**
 * Controller do modulo de MRP persistente.
 */
exports.generatePlan = async (req, res, next) => {
  try {
    const body = createMrpPlanSchema.parse(req.body);
    // Repositorios de requisicao/item-fornecedor sao injetados para
    // habilitar o fechamento automatico plano -> requisicao (roadmap
    // pos-Go-Live item 3, opt-in por item via `items.conversao_automatica`).
    const useCase = new GenerateMrpPlanUseCase(mrpRepository, itemRepository, requisitionRepository, itemSupplierRepository);
    const data = await useCase.execute({ ...body, requester_id: req.user.id });

    const autoConvertedOrders = data.filter((order) => order.status === 'EM_EXECUCAO');
    if (autoConvertedOrders.length > 0) {
      logAction(req, {
        action: 'mrp_auto_convert_to_requisition',
        entityType: 'MrpOrdemPlanejada',
        entityDescription: `${autoConvertedOrders.length} ordem(ns) planejada(s)`,
        newValues: { converted_ids: autoConvertedOrders.map((order) => order.id) },
        description: `${autoConvertedOrders.length} ordem(ns) planejada(s) convertida(s) automaticamente em requisicao de compra (opt-in items.conversao_automatica)`,
      });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.listPlannedOrders = async (_req, res, next) => {
  try {
    const useCase = new ListPlannedOrdersUseCase(mrpRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/mrp/planned-orders/convert` — converte um lote de ordens
 * planejadas do MRP em uma unica Requisicao de Compra, fechando o ciclo
 * planejamento -> suprimentos.
 */
exports.convertPlannedOrders = async (req, res, next) => {
  try {
    const body = convertPlannedOrdersSchema.parse(req.body);
    const useCase = new ConvertPlannedOrdersToRequisitionUseCase(
      mrpRepository,
      requisitionRepository,
      itemSupplierRepository,
    );
    const data = await useCase.execute({
      planned_order_ids: body.planned_order_ids,
      notes: body.notes,
      requester_id: req.user.id,
    });

    logAction(req, {
      action: 'convert_to_requisition',
      entityType: 'PurchaseRequisition',
      entityId: data.requisition?.id,
      entityDescription: data.requisition?.requisition_number,
      newValues: { status: data.requisition?.status, origin: data.requisition?.origin, converted_ids: data.converted_ids },
      description: `Requisicao de compra ${data.requisition?.requisition_number} gerada a partir de ${data.converted_ids.length} ordem(ns) planejada(s) do MRP`,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * `POST /api/mrp/planned-orders/convert-to-production` — converte um lote
 * de ordens planejadas do MRP em Ordens de Producao (uma OP por ordem
 * planejada), fechando o ciclo planejamento -> fabricacao propria para
 * itens `SUBCONJUNTO`/`PRODUTO_ACABADO` (complemento da conversao em
 * Requisicao de Compra, usada para itens `MATERIA_PRIMA`).
 */
exports.convertPlannedOrdersToProduction = async (req, res, next) => {
  try {
    const body = convertPlannedOrdersToProductionSchema.parse(req.body);
    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository,
      itemRepository,
      productionOrderRepository,
    );
    const data = await useCase.execute({
      planned_order_ids: body.planned_order_ids,
      notes: body.notes,
      requester_id: req.user.id,
    });

    logAction(req, {
      action: 'convert_to_production_order',
      entityType: 'ProductionOrder',
      entityDescription: `${data.production_orders.length} OP(s)`,
      newValues: {
        order_numbers: data.production_orders.map((order) => order.order_number),
        converted_ids: data.converted_ids,
      },
      description: `${data.production_orders.length} Ordem(ns) de Producao gerada(s) a partir de ${data.converted_ids.length} ordem(ns) planejada(s) do MRP`,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};
