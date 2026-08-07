import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Relatórios/KPIs de Marketing (`/api/marketing/reports`),
 * NOVO no BLOCO 5 MKT (correção) — RF-MKT-026 a 029, UC-66.
 *
 * @module modules/marketing/presentation/controllers/reportController
 */

const SequelizeLeadRepository = require('../../infrastructure/sequelize/SequelizeLeadRepository');
const SequelizeCampaignRepository = require('../../infrastructure/sequelize/SequelizeCampaignRepository');
const SequelizeEventRepository = require('../../infrastructure/sequelize/SequelizeEventRepository');
const SalesRevenueServiceAdapter = require('../../infrastructure/adapters/SalesRevenueServiceAdapter');
const GetFunnelReportUseCase = require('../../application/use-cases/report/GetFunnelReportUseCase');
const GetEventsReportUseCase = require('../../application/use-cases/report/GetEventsReportUseCase');
const { funnelReportQuerySchema, eventsReportQuerySchema, handleZodError } = require('../validators/reportValidators');

const leadRepository = new SequelizeLeadRepository();
const campaignRepository = new SequelizeCampaignRepository();
const eventRepository = new SequelizeEventRepository();
const salesRevenueService = new SalesRevenueServiceAdapter();

/** `GET /api/marketing/reports/funnel` — 7 dos 8 KPIs de funil (RF-MKT-026), sempre `200` (mesmo sem dados, UC-66 E1). */
exports.funnel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = funnelReportQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GetFunnelReportUseCase(leadRepository, campaignRepository, salesRevenueService);
    const report = await useCase.execute(parsed.data);

    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};

/** `GET /api/marketing/reports/events` — ROI/custo por lead agregado por evento (RF-MKT-024/027). */
exports.events = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = eventsReportQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GetEventsReportUseCase(eventRepository, leadRepository, salesRevenueService);
    const report = await useCase.execute(parsed.data);

    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};
