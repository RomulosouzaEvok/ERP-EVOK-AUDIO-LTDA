/**
 * Controller de `JurLegalAlert` — entidade única de alerta do módulo (§8.1).
 *
 * @module modules/juridico/presentation/controllers/alertController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeLegalAlertRepository = require('../../infrastructure/sequelize/SequelizeLegalAlertRepository');
const { logAction } = require('../../../../services/auditLogService');

const ListAlertsUseCase = require('../../application/use-cases/alert/ListAlertsUseCase');
const GetAlertByIdUseCase = require('../../application/use-cases/alert/GetAlertByIdUseCase');
const AcknowledgeAlertUseCase = require('../../application/use-cases/alert/AcknowledgeAlertUseCase');

const alertRepository = new SequelizeLegalAlertRepository();

/** `GET /api/jur/alerts` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListAlertsUseCase(alertRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/alerts/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetAlertByIdUseCase(alertRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/alerts/:id/acknowledge` */
exports.acknowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await new AcknowledgeAlertUseCase(alertRepository).execute({ id: Number(req.params.id) });
    logAction(req, { action: 'acknowledge', entityType: 'JurLegalAlert', entityId: Number(req.params.id) });
    res.json({ success: true, data: alert });
  } catch (error) { next(error); }
};
