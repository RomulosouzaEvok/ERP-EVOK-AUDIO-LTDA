import type { Request, Response, NextFunction } from 'express';

const SequelizeDashboardRepository = require('../../infrastructure/sequelize/SequelizeDashboardRepository');
const GetDashboardSummaryUseCase = require('../../application/use-cases/GetDashboardSummaryUseCase');
const GetDashboardHandoffsUseCase = require('../../application/use-cases/GetDashboardHandoffsUseCase');
const GetDepartmentDemandsUseCase = require('../../application/use-cases/GetDepartmentDemandsUseCase');

/**
 * Controller enxuto do módulo `dashboard`. Delega toda a agregação de dados
 * ao use case da camada de aplicação, mantendo o mesmo contrato JSON do
 * controller anterior (`server/src/controllers/dashboardController.ts`).
 */
const dashboardRepository = new SequelizeDashboardRepository();

/** `GET /api/dashboard` — indicadores agregados do dashboard principal. */
exports.index = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetDashboardSummaryUseCase(dashboardRepository);
    const summary = await useCase.execute();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/dashboard/handoffs` — resumo por área do semáforo de handoff
 * (UC-40, Bloco 3.3): pendentes de Recebimento, Requisições aguardando
 * aprovação, vendas prontas para embarque (Expedição) e Qualidade
 * (lotes em quarentena + RNCs abertas/em análise).
 */
exports.handoffs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetDashboardHandoffsUseCase(dashboardRepository);
    const summary = await useCase.execute();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/dashboard/department-demands` — painel de TV: demandas em
 * aberto (OPs, requisições de compra e contagens de inventário) agrupadas
 * por departamento, consumido pelo app Android TV (`tv/`, construído em
 * paralelo por outro time) para acompanhamento nas telas do chão de
 * fábrica.
 *
 * "Sem login" aqui se refere apenas a NÃO exigir que um funcionário abra o
 * navegador/sistema web para acompanhar as demandas — a rota EXIGE
 * autenticação normal (`authenticate` + `authorizeModule('dashboard')`,
 * ver `server/src/modules/dashboard/presentation/routes/dashboard.ts`). O
 * app `tv/` autentica com uma conta de serviço dedicada (token JWT próprio)
 * para chamar este endpoint, exatamente como qualquer outro cliente da API.
 */
exports.departmentDemands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetDepartmentDemandsUseCase(dashboardRepository);
    const departments = await useCase.execute();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};
