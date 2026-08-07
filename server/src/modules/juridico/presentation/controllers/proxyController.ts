/**
 * Controller do cluster Procuração — `JurProxy` (UC-55,
 * `docs/business/BLOCO_3_JUR_API.md` §5).
 *
 * @module modules/juridico/presentation/controllers/proxyController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeProxyRepository = require('../../infrastructure/sequelize/SequelizeProxyRepository');
const SequelizeLegalAlertRepository = require('../../infrastructure/sequelize/SequelizeLegalAlertRepository');
const { logAction } = require('../../../../services/auditLogService');

const CreateProxyUseCase = require('../../application/use-cases/proxy/CreateProxyUseCase');
const ListProxiesUseCase = require('../../application/use-cases/proxy/ListProxiesUseCase');
const GetProxyByIdUseCase = require('../../application/use-cases/proxy/GetProxyByIdUseCase');
const RevokeProxyUseCase = require('../../application/use-cases/proxy/RevokeProxyUseCase');

const proxyRepository = new SequelizeProxyRepository();
const alertRepository = new SequelizeLegalAlertRepository();

/** `GET /api/jur/proxies` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListProxiesUseCase(proxyRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/proxies/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetProxyByIdUseCase(proxyRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/proxies` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proxy = await new CreateProxyUseCase(proxyRepository, alertRepository).execute({ ...req.body, createdBy: (req as any).user.id });
    logAction(req, { action: 'create', entityType: 'JurProxy', entityId: proxy.id, newValues: proxy });
    res.status(201).json({ success: true, data: proxy });
  } catch (error) { next(error); }
};

/** `POST /api/jur/proxies/:id/revoke` */
exports.revoke = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proxy = await new RevokeProxyUseCase(proxyRepository).execute({
      id: Number(req.params.id),
      revocation_date: req.body?.revocation_date ?? null,
      communication_record: req.body?.communication_record,
    });
    logAction(req, { action: 'revoke', entityType: 'JurProxy', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: proxy });
  } catch (error) { next(error); }
};
