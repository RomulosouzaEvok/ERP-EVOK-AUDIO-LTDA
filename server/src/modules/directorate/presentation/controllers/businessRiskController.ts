import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Riscos Corporativos (`/api/directorate/business-risks`).
 *
 * @module modules/directorate/presentation/controllers/businessRiskController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeDirectorateRepository = require('../../infrastructure/sequelize/SequelizeDirectorateRepository');
const CreateBusinessRiskUseCase = require('../../application/use-cases/business-risk/CreateBusinessRiskUseCase');
const ListBusinessRisksUseCase = require('../../application/use-cases/business-risk/ListBusinessRisksUseCase');
const GetBusinessRiskByIdUseCase = require('../../application/use-cases/business-risk/GetBusinessRiskByIdUseCase');
const UpdateBusinessRiskUseCase = require('../../application/use-cases/business-risk/UpdateBusinessRiskUseCase');
const {
  createBusinessRiskSchema, updateBusinessRiskSchema, listBusinessRiskQuerySchema, handleZodError,
} = require('../validators/directorateValidators');
const { ValidationError } = require('../../../../errors');

const directorateRepository = new SequelizeDirectorateRepository();

/** `GET /api/directorate/business-risks` — lista paginada, filtros `status`/`risk_category`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listBusinessRiskQuerySchema.parse(req.query);
    const useCase = new ListBusinessRisksUseCase(directorateRepository);
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

/** `GET /api/directorate/business-risks/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetBusinessRiskByIdUseCase(directorateRepository);
    const risk = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: risk });
  } catch (error) { next(error); }
};

/** `POST /api/directorate/business-risks` — registra um risco (`risk_score` sempre calculado no servidor). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBusinessRiskSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateBusinessRiskUseCase(directorateRepository);
    const risk = await useCase.execute({ ...parsed.data, createdBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'BusinessRisk',
      entityId: risk?.id,
      entityDescription: `${risk?.risk_category} - score ${risk?.risk_score}`,
      newValues: {
        risk_category: risk?.risk_category, probability: risk?.probability, impact: risk?.impact, risk_score: risk?.risk_score,
      },
      description: `Risco corporativo ${risk?.id} registrado (${risk?.risk_category}, score ${risk?.risk_score})`,
    });

    res.status(201).json({ success: true, data: risk });
  } catch (error) { next(error); }
};

/** `PUT /api/directorate/business-risks/:id` — atualiza um risco (`risk_score` recalculado se probability/impact mudam). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateBusinessRiskSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateBusinessRiskUseCase(directorateRepository);
    const risk = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'BusinessRisk',
      entityId: risk?.id,
      newValues: { ...parsed.data, risk_score: risk?.risk_score },
      description: `Risco corporativo ${risk?.id} atualizado (score ${risk?.risk_score})`,
    });

    res.json({ success: true, data: risk });
  } catch (error) { next(error); }
};
