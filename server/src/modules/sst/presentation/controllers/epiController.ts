/**
 * Controller do cluster EPI (NR-6) — TipoEPI, MatrizEPI, EntregaEPI.
 *
 * @module modules/sst/presentation/controllers/epiController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeEpiRepository = require('../../infrastructure/sequelize/SequelizeEpiRepository');
const InventoryMovementServiceAdapter = require('../../infrastructure/adapters/InventoryMovementServiceAdapter');

const ListEpiTypesUseCase = require('../../application/use-cases/epi/ListEpiTypesUseCase');
const GetEpiTypeByIdUseCase = require('../../application/use-cases/epi/GetEpiTypeByIdUseCase');
const CreateEpiTypeUseCase = require('../../application/use-cases/epi/CreateEpiTypeUseCase');
const UpdateEpiTypeUseCase = require('../../application/use-cases/epi/UpdateEpiTypeUseCase');

const ListEpiMatrixUseCase = require('../../application/use-cases/epi/ListEpiMatrixUseCase');
const CreateEpiMatrixUseCase = require('../../application/use-cases/epi/CreateEpiMatrixUseCase');
const UpdateEpiMatrixUseCase = require('../../application/use-cases/epi/UpdateEpiMatrixUseCase');
const DeleteEpiMatrixUseCase = require('../../application/use-cases/epi/DeleteEpiMatrixUseCase');

const ListEpiDeliveriesUseCase = require('../../application/use-cases/epi/ListEpiDeliveriesUseCase');
const GetEpiDeliveryByIdUseCase = require('../../application/use-cases/epi/GetEpiDeliveryByIdUseCase');
const CreateEpiDeliveryUseCase = require('../../application/use-cases/epi/CreateEpiDeliveryUseCase');
const AttachEpiDeliveryEvidenceUseCase = require('../../application/use-cases/epi/AttachEpiDeliveryEvidenceUseCase');
const ConfirmEpiDeliveryUseCase = require('../../application/use-cases/epi/ConfirmEpiDeliveryUseCase');
const ReturnEpiDeliveryUseCase = require('../../application/use-cases/epi/ReturnEpiDeliveryUseCase');
const GetEpiDeliveryFichaUseCase = require('../../application/use-cases/epi/GetEpiDeliveryFichaUseCase');
const GetEpiDeliveryPendingReportUseCase = require('../../application/use-cases/epi/GetEpiDeliveryPendingReportUseCase');

const epiRepository = new SequelizeEpiRepository();
const inventoryMovementService = new InventoryMovementServiceAdapter();

/** `GET /api/sst/epi-types` */
exports.listTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListEpiTypesUseCase(epiRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/sst/epi-types/:id` */
exports.getTypeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo = await new GetEpiTypeByIdUseCase(epiRepository).execute({ id: req.params.id });
    res.json({ success: true, data: tipo });
  } catch (error) { next(error); }
};

/** `POST /api/sst/epi-types` */
exports.createType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo = await new CreateEpiTypeUseCase(epiRepository).execute({ body: req.body, createdBy: (req as any).user.id });
    res.status(201).json({ success: true, data: tipo });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/epi-types/:id` */
exports.updateType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo = await new UpdateEpiTypeUseCase(epiRepository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: tipo });
  } catch (error) { next(error); }
};

/** `GET /api/sst/epi-matrix` */
exports.listMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListEpiMatrixUseCase(epiRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/epi-matrix` */
exports.createMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matriz = await new CreateEpiMatrixUseCase(epiRepository).execute({ body: req.body });
    res.status(201).json({ success: true, data: matriz });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/epi-matrix/:id` */
exports.updateMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matriz = await new UpdateEpiMatrixUseCase(epiRepository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: matriz });
  } catch (error) { next(error); }
};

/** `DELETE /api/sst/epi-matrix/:id` */
exports.deleteMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await new DeleteEpiMatrixUseCase(epiRepository).execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/** `GET /api/sst/epi-deliveries` */
exports.listDeliveries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListEpiDeliveriesUseCase(epiRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/sst/epi-deliveries/pending-report` — precisa vir ANTES de `/:id` na rota. */
exports.pendingReport = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetEpiDeliveryPendingReportUseCase(epiRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/epi-deliveries/ficha/:employeeId` */
exports.ficha = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetEpiDeliveryFichaUseCase(epiRepository).execute({ employeeId: req.params.employeeId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/epi-deliveries/:id` */
exports.getDeliveryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entrega = await new GetEpiDeliveryByIdUseCase(epiRepository).execute({ id: req.params.id });
    res.json({ success: true, data: entrega });
  } catch (error) { next(error); }
};

/** `POST /api/sst/epi-deliveries` */
exports.createDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entrega = await new CreateEpiDeliveryUseCase(epiRepository).execute({ body: req.body, entreguePor: (req as any).user.id });
    res.status(201).json({ success: true, data: entrega });
  } catch (error) { next(error); }
};

/** `PATCH /api/sst/epi-deliveries/:id/evidence` */
exports.attachEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entrega = await new AttachEpiDeliveryEvidenceUseCase(epiRepository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: entrega });
  } catch (error) { next(error); }
};

/** `POST /api/sst/epi-deliveries/:id/confirm` */
exports.confirmDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entrega = await new ConfirmEpiDeliveryUseCase(epiRepository, inventoryMovementService).execute({ id: req.params.id, confirmedBy: (req as any).user.id });
    res.json({ success: true, data: entrega });
  } catch (error) { next(error); }
};

/** `POST /api/sst/epi-deliveries/:id/return` */
exports.returnDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devolucao = await new ReturnEpiDeliveryUseCase(epiRepository).execute({ id: req.params.id, body: req.body, registradoPor: (req as any).user.id });
    res.status(201).json({ success: true, data: devolucao });
  } catch (error) { next(error); }
};
