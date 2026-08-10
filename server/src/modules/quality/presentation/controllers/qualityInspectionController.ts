import type { Request, Response, NextFunction } from 'express';

const SequelizeQualityRepository = require('../../infrastructure/sequelize/SequelizeQualityRepository');
const CreateQualityInspectionUseCase = require('../../application/use-cases/CreateQualityInspectionUseCase');
const ListQualityInspectionsUseCase = require('../../application/use-cases/ListQualityInspectionsUseCase');
const GetLotReleaseEligibilityUseCase = require('../../application/use-cases/GetLotReleaseEligibilityUseCase');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Controller do registro de inspeção de qualidade (G7), montado sob
 * `/api/quality/inspections` e `/api/quality/lots` em `server/app.ts`.
 *
 * ⚠️ `inspector_id` **nunca** vem do body: é sempre `req.user.id` (JWT).
 * Anti-spoofing de identidade é regra P0 do projeto (remediação 3.1 de
 * 2026-08-02) e, no caso da inspeção, é literalmente o requisito da ISO 9001
 * §8.6 — "rastreabilidade à(s) pessoa(s) que autorizou(aram)" não vale nada
 * se quem chama a API pode dizer quem foi.
 *
 * @module modules/quality/presentation/controllers/qualityInspectionController
 */
const qualityRepository = new SequelizeQualityRepository();

/** `POST /api/quality/inspections` — registra uma inspeção de lote. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateQualityInspectionUseCase(qualityRepository);
    const inspection = await useCase.execute({ ...req.body, inspectorId: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'QualityInspection',
      entityId: inspection.id,
      entityDescription: `Inspecao ${inspection.inspection_number}`,
      newValues: { lot_id: inspection.lot_id, verdict: inspection.verdict, stage: inspection.stage },
      description: `Inspecao ${inspection.inspection_number} do lote #${inspection.lot_id}: ${inspection.verdict}`
    });

    res.status(201).json({ success: true, data: inspection });
  } catch (error) { next(error); }
};

/** `GET /api/quality/inspections` — lista inspeções (filtros `lot_id`, `verdict`, `stage`, `inspector_id`). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListQualityInspectionsUseCase(qualityRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query as any);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/quality/lots/:lotId/release-eligibility` — diagnóstico do gate de
 * liberação do lote. Leitura pura, sem efeito colateral.
 */
exports.getLotReleaseEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetLotReleaseEligibilityUseCase(qualityRepository);
    const result = await useCase.execute({ lotId: req.params.lotId });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};
