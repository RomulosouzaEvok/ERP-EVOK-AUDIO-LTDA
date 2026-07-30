const SequelizeMrpRepository = require('../../infrastructure/sequelize/SequelizeMrpRepository');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
const GenerateMrpPlanUseCase = require('../../application/use-cases/GenerateMrpPlanUseCase');
const ListPlannedOrdersUseCase = require('../../application/use-cases/ListPlannedOrdersUseCase');
const { createMrpPlanSchema } = require('../validators/mrpValidators');
const { ValidationError } = require('../../../../errors');

const mrpRepository = new SequelizeMrpRepository();
const itemRepository = new SequelizeItemRepository();

/**
 * Controller do modulo de MRP persistente.
 */
exports.generatePlan = async (req, res, next) => {
  try {
    const body = createMrpPlanSchema.parse(req.body);
    const useCase = new GenerateMrpPlanUseCase(mrpRepository, itemRepository);
    const data = await useCase.execute(body);
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
