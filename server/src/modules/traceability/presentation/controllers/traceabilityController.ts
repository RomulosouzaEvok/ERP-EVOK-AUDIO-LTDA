/**
 * Controller do modulo de rastreabilidade industrial.
 *
 * @module modules/traceability/presentation/controllers/traceabilityController
 */

const SequelizeTraceabilityRepository = require('../../infrastructure/sequelize/SequelizeTraceabilityRepository');
const GetItemTraceabilityUseCase = require('../../application/use-cases/GetItemTraceabilityUseCase');
const GetLotTraceabilityUseCase = require('../../application/use-cases/GetLotTraceabilityUseCase');
const GetProductionOrderTraceabilityUseCase = require('../../application/use-cases/GetProductionOrderTraceabilityUseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');

const traceabilityRepository = new SequelizeTraceabilityRepository();

/**
 * GET /api/traceability/items/:id
 * Retorna o historico de movimentacoes de um item.
 */
exports.getItemTraceability = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new ValidationError('Parametro id e obrigatorio.'));

    const useCase = new GetItemTraceabilityUseCase(traceabilityRepository);
    const data = await useCase.execute(id);

    if (!data || data.length === 0) {
      return next(new NotFoundError('Nenhum movimento encontrado para o item informado.'));
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/traceability/lots/:id
 * Retorna o historico completo de um lote.
 */
exports.getLotTraceability = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new ValidationError('Parametro id e obrigatorio.'));

    const useCase = new GetLotTraceabilityUseCase(traceabilityRepository);
    const data = await useCase.execute(id);

    if (!data || data.length === 0) {
      return next(new NotFoundError('Nenhum movimento encontrado para o lote informado.'));
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/traceability/production-orders/:id
 * Retorna os detalhes de uma OP com todos os insumos consumidos.
 */
exports.getProductionOrderTraceability = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new ValidationError('Parametro id e obrigatorio.'));

    const useCase = new GetProductionOrderTraceabilityUseCase(traceabilityRepository);
    const data = await useCase.execute(id);

    if (!data) {
      return next(new NotFoundError('Ordem de producao nao encontrada.'));
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

