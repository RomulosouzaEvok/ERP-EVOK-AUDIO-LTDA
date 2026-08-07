import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Veículos de Frota (`/api/facilities/vehicles`) e
 * Documentos com Vencimento (`/api/facilities/vehicles/:assetId/documents`).
 * Desde o BLOCO 4 FAC (correção, D-2), o `id` do recurso é o `asset_id`.
 *
 * @module modules/facilities/presentation/controllers/vehicleController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeVehicleRepository = require('../../infrastructure/sequelize/SequelizeVehicleRepository');
const SequelizeVehicleDocumentRepository = require('../../infrastructure/sequelize/SequelizeVehicleDocumentRepository');
const AssetServiceAdapter = require('../../infrastructure/adapters/AssetServiceAdapter');
const ListVehiclesUseCase = require('../../application/use-cases/vehicle/ListVehiclesUseCase');
const GetVehicleByIdUseCase = require('../../application/use-cases/vehicle/GetVehicleByIdUseCase');
const CreateVehicleUseCase = require('../../application/use-cases/vehicle/CreateVehicleUseCase');
const UpdateVehicleUseCase = require('../../application/use-cases/vehicle/UpdateVehicleUseCase');
const {
  ListVehicleDocumentsUseCase, CreateVehicleDocumentUseCase, RenewVehicleDocumentUseCase, ReleaseVehicleDocumentUseCase,
} = require('../../application/use-cases/vehicleDocument/VehicleDocumentUseCases');
const {
  createVehicleSchema, updateVehicleSchema, listVehicleQuerySchema,
  createVehicleDocumentSchema, renewVehicleDocumentSchema, releaseVehicleDocumentSchema,
  handleZodError,
} = require('../validators/vehicleValidators');
const { ValidationError } = require('../../../../errors');

const vehicleRepository = new SequelizeVehicleRepository();
const documentRepository = new SequelizeVehicleDocumentRepository();
const assetService = new AssetServiceAdapter();

/** `GET /api/facilities/vehicles` — lista paginada (join Asset+extensão), com filtros. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listVehicleQuerySchema.parse(req.query);
    const useCase = new ListVehiclesUseCase(vehicleRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/facilities/vehicles/:assetId` — detalhe completo (asset + extensão). */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetVehicleByIdUseCase(vehicleRepository);
    const vehicle = await useCase.execute({ id: Number(req.params.assetId) });
    res.json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/vehicles` — cria Asset + FacilityVehicleDetail numa transação (RF-FAC-006). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateVehicleUseCase(vehicleRepository, assetService);
    const result = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityVehicleDetail',
      entityId: result?.asset_id,
      entityDescription: result?.vehicle_detail?.plate,
      newValues: { plate: result?.vehicle_detail?.plate, brand: parsed.data.brand, model: parsed.data.model },
      description: `Veículo ${result?.vehicle_detail?.plate} criado`,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

/** `PUT /api/facilities/vehicles/:assetId` — atualiza campos da extensão. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateVehicleSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateVehicleUseCase(vehicleRepository);
    const vehicle = await useCase.execute({ id: Number(req.params.assetId), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVehicleDetail',
      entityId: vehicle?.asset_id,
      entityDescription: vehicle?.plate,
      newValues: parsed.data,
      description: `Veículo ${vehicle?.plate} atualizado`,
    });

    res.json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

/** `GET /api/facilities/vehicles/:assetId/documents` */
exports.listDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListVehicleDocumentsUseCase(documentRepository, vehicleRepository);
    const documents = await useCase.execute({ assetId: Number(req.params.assetId) });
    res.json({ success: true, data: documents });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/vehicles/:assetId/documents` */
exports.createDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVehicleDocumentSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateVehicleDocumentUseCase(documentRepository, vehicleRepository);
    const document = await useCase.execute({ ...parsed.data, asset_id: Number(req.params.assetId) });

    logAction(req, {
      action: 'create',
      entityType: 'FacilityVehicleDocument',
      entityId: document?.id,
      entityDescription: `${document?.doc_type} — asset #${req.params.assetId}`,
      newValues: parsed.data,
      description: `Documento ${document?.doc_type} cadastrado para o veículo #${req.params.assetId}`,
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/vehicles/:assetId/documents/:docId/renew` */
exports.renewDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = renewVehicleDocumentSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new RenewVehicleDocumentUseCase(documentRepository);
    const document = await useCase.execute({ docId: Number(req.params.docId), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVehicleDocument',
      entityId: document?.id,
      description: `Documento #${req.params.docId} renovado`,
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/vehicles/:assetId/documents/:docId/release` — nível approve (RF-FAC-010). */
exports.releaseDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = releaseVehicleDocumentSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ReleaseVehicleDocumentUseCase(documentRepository);
    const document = await useCase.execute({ docId: Number(req.params.docId), releasedBy: (req as any).user.id, ...parsed.data });

    logAction(req, {
      action: 'approve',
      entityType: 'FacilityVehicleDocument',
      entityId: document?.id,
      description: `Saída liberada com documento vencido (#${req.params.docId}) — ${parsed.data.release_reason}`,
    });

    res.json({ success: true, data: document });
  } catch (error) { next(error); }
};
