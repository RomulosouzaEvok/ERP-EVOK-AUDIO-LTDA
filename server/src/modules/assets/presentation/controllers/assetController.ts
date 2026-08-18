import type { Request, Response, NextFunction } from 'express';

/**
 * Arquivo de upload processado pelo Multer (memória ou disco).
 * Definido localmente pois `@types/multer` não faz merge com `@types/express`
 * nesta versão do projeto (express 4.x runtime + @types/express 5.x).
 */
type MulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
};

type RequestWithFile = Request & { file?: MulterFile };

const SequelizeAssetsRepository = require('../../infrastructure/sequelize/SequelizeAssetsRepository');
const ListAssetsUseCase = require('../../application/use-cases/ListAssetsUseCase');
const GetAssetByIdUseCase = require('../../application/use-cases/GetAssetByIdUseCase');
const CreateAssetUseCase = require('../../application/use-cases/CreateAssetUseCase');
const UpdateAssetUseCase = require('../../application/use-cases/UpdateAssetUseCase');
const DeactivateAssetUseCase = require('../../application/use-cases/DeactivateAssetUseCase');
const UploadEntityPhotoUseCase = require('../../../../shared/application/UploadEntityPhotoUseCase');
const GenerateEntityQrCodeUseCase = require('../../../../shared/application/GenerateEntityQrCodeUseCase');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Controller enxuto do módulo `assets`. Delega toda a regra de negócio aos
 * use cases da camada de aplicação, mantendo o mesmo contrato JSON e os
 * mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/assetController.ts`).
 */
const assetsRepository = new SequelizeAssetsRepository();

/** `GET /api/assets` — lista ativos (filtros e paginação). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListAssetsUseCase(assetsRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/assets/:id` — busca um ativo pelo id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetAssetByIdUseCase(assetsRepository);
    const asset = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/assets` — cria um novo ativo. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateAssetUseCase(assetsRepository);
    const asset = await useCase.execute(req.body);

    logAction(req, {
      action: 'create',
      entityType: 'Asset',
      entityId: asset.id,
      entityDescription: asset.tag,
      newValues: { tag: asset.tag, name: asset.name, department_id: asset.department_id, status: asset.status },
      description: `Ativo ${asset.tag} criado`,
    });

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/assets/:id` — atualiza um ativo existente. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await assetsRepository.findById(Number(req.params.id));
    const useCase = new UpdateAssetUseCase(assetsRepository);
    const asset = await useCase.execute({ id: req.params.id, body: req.body });

    logAction(req, {
      action: 'update',
      entityType: 'Asset',
      entityId: asset.id,
      entityDescription: asset.tag,
      oldValues: {
        tag: before.tag,
        name: before.name,
        department_id: before.department_id,
        status: before.status,
      },
      newValues: {
        tag: asset.tag,
        name: asset.name,
        department_id: asset.department_id,
        status: asset.status,
      },
      description: `Ativo ${asset.tag} atualizado`,
    });

    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/assets/:id` — inativa (soft delete) um ativo. */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await assetsRepository.findById(Number(req.params.id));
    const useCase = new DeactivateAssetUseCase(assetsRepository);
    const result = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'soft_delete',
      entityType: 'Asset',
      entityId: before.id,
      entityDescription: before.tag,
      oldValues: { status: before.status },
      newValues: { status: 'decommissioned' },
      description: `Ativo ${before.tag} inativado`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/assets/:id/photo` — envia/substitui a foto do ativo. */
exports.uploadPhoto = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const before = await assetsRepository.findById(Number(req.params.id));
    const useCase = new UploadEntityPhotoUseCase();
    const { entity } = await useCase.execute({
      repository: assetsRepository,
      id: req.params.id,
      file: req.file,
      subfolder: 'assets',
      entityLabel: 'Ativo',
    });

    logAction(req, {
      action: 'update',
      entityType: 'Asset',
      entityId: entity.id,
      entityDescription: entity.tag,
      oldValues: { has_photo: Boolean(before.photo_path) },
      newValues: { has_photo: true },
      description: `Foto do ativo ${entity.tag} atualizada`,
    });

    res.json({ success: true, data: entity });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/assets/:id/qrcode` — gera o QR Code do ativo (PNG ou SVG via `?format=svg`). */
exports.getQrCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GenerateEntityQrCodeUseCase();
    const result = await useCase.execute({
      repository: assetsRepository,
      id: req.params.id,
      entityType: 'asset',
      entityLabel: 'Ativo',
      format: req.query.format === 'svg' ? 'svg' : 'png',
      buildData: (asset: { tag: string; name: string }) => ({ tag: asset.tag, name: asset.name }),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
