import type { Request, Response, NextFunction } from 'express';

/**
 * Arquivo de upload processado pelo Multer (memória). Definido localmente
 * pelo mesmo motivo de `assetController.ts`: `@types/multer` não faz merge
 * com `@types/express` nesta versão do projeto.
 */
type MulterFile = { originalname: string; mimetype: string; size: number; buffer?: Buffer };
type RequestWithFile = Request & { file?: MulterFile };

/**
 * Controller HTTP de Materiais de Divulgação (`/api/marketing/materials`).
 *
 * @module modules/marketing/presentation/controllers/materialController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeMaterialRepository = require('../../infrastructure/sequelize/SequelizeMaterialRepository');
const ListMaterialsUseCase = require('../../application/use-cases/material/ListMaterialsUseCase');
const GetMaterialByIdUseCase = require('../../application/use-cases/material/GetMaterialByIdUseCase');
const CreateMaterialUseCase = require('../../application/use-cases/material/CreateMaterialUseCase');
const UpdateMaterialUseCase = require('../../application/use-cases/material/UpdateMaterialUseCase');
const UploadMaterialFileUseCase = require('../../application/use-cases/material/UploadMaterialFileUseCase');
const { createMaterialSchema, updateMaterialSchema, listMaterialQuerySchema, handleZodError } = require('../validators/materialValidators');
const { ValidationError } = require('../../../../errors');

const materialRepository = new SequelizeMaterialRepository();

/** `GET /api/marketing/materials` — lista paginada, com filtros opcionais de `material_type`/`product_id`/`approved`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listMaterialQuerySchema.parse(req.query);
    const useCase = new ListMaterialsUseCase(materialRepository);
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

/** `GET /api/marketing/materials/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetMaterialByIdUseCase(materialRepository);
    const material = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: material });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/materials` — cria os metadados de um material (arquivo enviado depois). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createMaterialSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateMaterialUseCase(materialRepository);
    const material = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'MarketingMaterial',
      entityId: material?.id,
      entityDescription: material?.title,
      newValues: { title: material?.title, material_type: material?.material_type },
      description: `Material "${material?.title}" criado`,
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/materials/:id` — atualiza metadados do material. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateMaterialSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateMaterialUseCase(materialRepository);
    const material = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingMaterial',
      entityId: material?.id,
      entityDescription: material?.title,
      newValues: parsed.data,
      description: `Material "${material?.title}" atualizado`,
    });

    res.json({ success: true, data: material });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/materials/:id/file` — envia/substitui o arquivo do material. */
exports.uploadFile = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const useCase = new UploadMaterialFileUseCase();
    const material = await useCase.execute({
      materialRepository,
      id: Number(req.params.id),
      file: req.file,
    });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingMaterial',
      entityId: material?.id,
      entityDescription: material?.title,
      newValues: { file_path: material?.file_path },
      description: `Arquivo do material "${material?.title}" enviado`,
    });

    res.json({ success: true, data: material });
  } catch (error) { next(error); }
};
