const SequelizeDashboardRepository = require('../../infrastructure/sequelize/SequelizeDashboardRepository');
const GetDashboardSummaryUseCase = require('../../application/use-cases/GetDashboardSummaryUseCase');

/**
 * Controller enxuto do módulo `dashboard`. Delega toda a agregação de dados
 * ao use case da camada de aplicação, mantendo o mesmo contrato JSON do
 * controller anterior (`server/src/controllers/dashboardController.ts`).
 */
const dashboardRepository = new SequelizeDashboardRepository();

/** `GET /api/dashboard` — indicadores agregados do dashboard principal. */
exports.index = async (req, res, next) => {
  try {
    const useCase = new GetDashboardSummaryUseCase(dashboardRepository);
    const summary = await useCase.execute();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
