/**
 * Controller do cluster Licenças de Software (P3,
 * `docs/business/BLOCO_2_TI_API.md` §3).
 *
 * @module modules/ti/presentation/controllers/licenseController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeLicenseRepository = require('../../infrastructure/sequelize/SequelizeLicenseRepository');
const SequelizeTiSettingsRepository = require('../../infrastructure/sequelize/SequelizeTiSettingsRepository');
const AssetLookupServiceAdapter = require('../../infrastructure/adapters/AssetLookupServiceAdapter');
const PurchaseRequisitionServiceAdapter = require('../../infrastructure/adapters/PurchaseRequisitionServiceAdapter');
const { logAction } = require('../../../../services/auditLogService');

const CreateLicenseDetailUseCase = require('../../application/use-cases/license/CreateLicenseDetailUseCase');
const UpdateLicenseDetailUseCase = require('../../application/use-cases/license/UpdateLicenseDetailUseCase');
const ListLicensesUseCase = require('../../application/use-cases/license/ListLicensesUseCase');
const GetLicenseByIdUseCase = require('../../application/use-cases/license/GetLicenseByIdUseCase');
const RevealLicenseKeyUseCase = require('../../application/use-cases/license/RevealLicenseKeyUseCase');
const ListLicenseSeatsUseCase = require('../../application/use-cases/license/ListLicenseSeatsUseCase');
const AllocateSeatUseCase = require('../../application/use-cases/license/AllocateSeatUseCase');
const RevokeSeatUseCase = require('../../application/use-cases/license/RevokeSeatUseCase');
const ListExpiringLicensesUseCase = require('../../application/use-cases/license/ListExpiringLicensesUseCase');
const RequestRenewalUseCase = require('../../application/use-cases/license/RequestRenewalUseCase');
const { createLicenseSchema, updateLicenseSchema, handleZodError } = require('../validators/licenseValidators');

const licenseRepository = new SequelizeLicenseRepository();
const settingsRepository = new SequelizeTiSettingsRepository();
const assetLookupService = new AssetLookupServiceAdapter();
const purchaseRequisitionService = new PurchaseRequisitionServiceAdapter();

/** `GET /api/ti/licenses` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListLicensesUseCase(licenseRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/ti/licenses/expiring` — precisa vir ANTES de `/:assetId` na rota. */
exports.expiring = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListExpiringLicensesUseCase(licenseRepository, settingsRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/ti/licenses/:assetId` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetLicenseByIdUseCase(licenseRepository).execute({ assetId: Number(req.params.assetId) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/licenses` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createLicenseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const data = await new CreateLicenseDetailUseCase(licenseRepository, assetLookupService).execute(parsed.data);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `PUT /api/ti/licenses/:assetId` */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateLicenseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const data = await new UpdateLicenseDetailUseCase(licenseRepository).execute({ assetId: Number(req.params.assetId), ...parsed.data });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/licenses/:assetId/reveal-key` — todo acesso gera log de leitura (RNF-TI-01). */
exports.revealKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await new RevealLicenseKeyUseCase(licenseRepository).execute({
      assetId: Number(req.params.assetId),
      requesterHasTiModule: Boolean(user?.permissions?.ti),
      requesterIsAdmin: user?.role === 'admin',
    });
    logAction(req, {
      action: 'read_sensitive',
      entityType: 'ItSoftwareLicenseDetail',
      entityId: Number(req.params.assetId),
      description: `Chave de licença do ativo ${req.params.assetId} exibida em claro por ${user?.email}`,
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/ti/licenses/:assetId/seats` */
exports.listSeats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListLicenseSeatsUseCase(licenseRepository).execute({ assetId: Number(req.params.assetId) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/licenses/:assetId/seats` */
exports.allocateSeat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new AllocateSeatUseCase(licenseRepository).execute({ assetId: Number(req.params.assetId), employee_id: req.body?.employee_id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `DELETE /api/ti/licenses/:assetId/seats/:seatId` */
exports.revokeSeat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new RevokeSeatUseCase(licenseRepository).execute({ seatId: Number(req.params.seatId) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/licenses/:assetId/request-renewal` */
exports.requestRenewal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new RequestRenewalUseCase(licenseRepository, purchaseRequisitionService).execute({
      assetId: Number(req.params.assetId),
      estimated_cost: req.body?.estimated_cost,
      justification: req.body?.justification,
      requesterId: (req as any).user.id,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};
