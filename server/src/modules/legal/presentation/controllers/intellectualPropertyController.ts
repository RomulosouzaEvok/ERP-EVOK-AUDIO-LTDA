import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Propriedade Intelectual
 * (`/api/legal/intellectual-property`).
 *
 * @module modules/legal/presentation/controllers/intellectualPropertyController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeIntellectualPropertyRepository = require('../../infrastructure/sequelize/SequelizeIntellectualPropertyRepository');
const ListIntellectualPropertyUseCase = require('../../application/use-cases/intellectualProperty/ListIntellectualPropertyUseCase');
const GetIntellectualPropertyByIdUseCase = require('../../application/use-cases/intellectualProperty/GetIntellectualPropertyByIdUseCase');
const CreateIntellectualPropertyUseCase = require('../../application/use-cases/intellectualProperty/CreateIntellectualPropertyUseCase');
const UpdateIntellectualPropertyUseCase = require('../../application/use-cases/intellectualProperty/UpdateIntellectualPropertyUseCase');
const ListExpiringIntellectualPropertyUseCase = require('../../application/use-cases/intellectualProperty/ListExpiringIntellectualPropertyUseCase');
const {
  createIntellectualPropertySchema, updateIntellectualPropertySchema,
  listIntellectualPropertyQuerySchema, expiringIntellectualPropertyQuerySchema, handleZodError,
} = require('../validators/intellectualPropertyValidators');
const { ValidationError } = require('../../../../errors');

const ipRepository = new SequelizeIntellectualPropertyRepository();

/** `GET /api/legal/intellectual-property` — lista paginada, com filtros opcionais de `ip_type`/`status`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listIntellectualPropertyQuerySchema.parse(req.query);
    const useCase = new ListIntellectualPropertyUseCase(ipRepository);
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

/**
 * `GET /api/legal/intellectual-property/expiring` — ativos de PI com
 * vencimento próximo (ou já vencido, ainda não `expired`/`abandoned`),
 * filtro `days` (default 30).
 */
exports.listExpiring = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = expiringIntellectualPropertyQuerySchema.parse(req.query);
    const useCase = new ListExpiringIntellectualPropertyUseCase(ipRepository);
    const items = await useCase.execute(query);
    res.json({ success: true, data: items });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/legal/intellectual-property/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetIntellectualPropertyByIdUseCase(ipRepository);
    const ip = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: ip });
  } catch (error) { next(error); }
};

/** `POST /api/legal/intellectual-property` — cria um ativo de PI. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createIntellectualPropertySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateIntellectualPropertyUseCase(ipRepository);
    const ip = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'LegalIntellectualProperty',
      entityId: ip?.id,
      entityDescription: ip?.title,
      newValues: { title: ip?.title, ip_type: ip?.ip_type, registration_number: ip?.registration_number },
      description: `Ativo de PI "${ip?.title}" criado`,
    });

    res.status(201).json({ success: true, data: ip });
  } catch (error) { next(error); }
};

/** `PUT /api/legal/intellectual-property/:id` — atualiza campos do ativo de PI. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateIntellectualPropertySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateIntellectualPropertyUseCase(ipRepository);
    const ip = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'LegalIntellectualProperty',
      entityId: ip?.id,
      entityDescription: ip?.title,
      newValues: parsed.data,
      description: `Ativo de PI "${ip?.title}" atualizado`,
    });

    res.json({ success: true, data: ip });
  } catch (error) { next(error); }
};
