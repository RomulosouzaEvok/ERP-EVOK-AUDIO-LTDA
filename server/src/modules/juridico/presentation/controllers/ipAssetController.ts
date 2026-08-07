/**
 * Controller do cluster Propriedade Intelectual — `JurIntellectualProperty`/
 * `JurIpContractLink` (RF-JUR-031 a 034,
 * `docs/business/BLOCO_3_JUR_API.md` §6). Regra de acesso mais restritiva
 * do módulo: `trade_secret` exige `role==='admin'`, não apenas
 * `authorizeModule('juridico', ...)` (§6.3).
 *
 * @module modules/juridico/presentation/controllers/ipAssetController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeIpAssetRepository = require('../../infrastructure/sequelize/SequelizeIpAssetRepository');
const SequelizeLegalAlertRepository = require('../../infrastructure/sequelize/SequelizeLegalAlertRepository');
const { logAction } = require('../../../../services/auditLogService');

const CreateIpAssetUseCase = require('../../application/use-cases/ipAsset/CreateIpAssetUseCase');
const UpdateIpAssetUseCase = require('../../application/use-cases/ipAsset/UpdateIpAssetUseCase');
const ListIpAssetsUseCase = require('../../application/use-cases/ipAsset/ListIpAssetsUseCase');
const GetIpAssetByIdUseCase = require('../../application/use-cases/ipAsset/GetIpAssetByIdUseCase');
const LinkIpContractUseCase = require('../../application/use-cases/ipAsset/LinkIpContractUseCase');
const ListIpContractLinksUseCase = require('../../application/use-cases/ipAsset/ListIpContractLinksUseCase');

const ipAssetRepository = new SequelizeIpAssetRepository();
const alertRepository = new SequelizeLegalAlertRepository();

function isAdmin(req: Request): boolean {
  return (req as any).user?.role === 'admin';
}

/** `GET /api/jur/ip-assets` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListIpAssetsUseCase(ipAssetRepository).execute({ filters, page: Number(page), limit: Number(limit), isAdmin: isAdmin(req) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/ip-assets/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetIpAssetByIdUseCase(ipAssetRepository).execute({ id: req.params.id, isAdmin: isAdmin(req) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/ip-assets` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAsset = await new CreateIpAssetUseCase(ipAssetRepository, alertRepository).execute(req.body);
    logAction(req, { action: 'create', entityType: 'JurIntellectualProperty', entityId: ipAsset.id, newValues: ipAsset });
    res.status(201).json({ success: true, data: ipAsset });
  } catch (error) { next(error); }
};

/** `PUT /api/jur/ip-assets/:id` */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAsset = await new UpdateIpAssetUseCase(ipAssetRepository).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'update', entityType: 'JurIntellectualProperty', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: ipAsset });
  } catch (error) { next(error); }
};

/** `POST /api/jur/ip-assets/:id/contracts` */
exports.linkContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const link = await new LinkIpContractUseCase(ipAssetRepository).execute({
      ipId: Number(req.params.id),
      contract_id: req.body?.contract_id,
      link_description: req.body?.link_description ?? null,
    });
    res.status(201).json({ success: true, data: link });
  } catch (error) { next(error); }
};

/** `GET /api/jur/ip-assets/:id/contracts` */
exports.listContractLinks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListIpContractLinksUseCase(ipAssetRepository).execute({ ipId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
