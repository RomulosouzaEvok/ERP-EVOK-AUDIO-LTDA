import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do organograma executivo e do provimento de cargo de
 * diretor, montado sob `/api/directorate`.
 *
 * @module modules/directorate/presentation/controllers/orgChartController
 */

const SequelizeDirectorateRepository = require('../../infrastructure/sequelize/SequelizeDirectorateRepository');
const GetExecutiveOrgChartUseCase = require('../../application/use-cases/org-chart/GetExecutiveOrgChartUseCase');
const AssignDirectorateManagerUseCase = require('../../application/use-cases/org-chart/AssignDirectorateManagerUseCase');
const { assignDirectorateManagerSchema, handleZodError } = require('../validators/directorateValidators');
const { logAction } = require('../../../../services/auditLogService');

const directorateRepository = new SequelizeDirectorateRepository();

/**
 * `GET /api/directorate/org-chart` — árvore CEO→diretorias→departamentos.
 * Leitura pública a qualquer autenticado (ver RBAC em `presentation/routes/directorate.ts`).
 */
exports.getOrgChart = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetExecutiveOrgChartUseCase(directorateRepository);
    const result = await useCase.execute();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/**
 * `PATCH /api/directorate/directorates/:id/manager` — prove ou vaga o cargo
 * de diretor. Exige `diretoria:approve` (governança sensível).
 */
exports.assignManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = assignDirectorateManagerSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new AssignDirectorateManagerUseCase(directorateRepository);
    const directorate = await useCase.execute({
      directorateId: Number(req.params.id),
      managerId: parsed.data.manager_id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'Directorate',
      entityId: directorate?.id,
      entityDescription: `${directorate?.code} - ${directorate?.name}`,
      newValues: { manager_id: parsed.data.manager_id },
      description: parsed.data.manager_id === null
        ? `Cargo de diretor de ${directorate?.name} foi vagado`
        : `Diretoria ${directorate?.name} recebeu novo diretor (funcionário #${parsed.data.manager_id})`,
    });

    res.json({ success: true, data: directorate });
  } catch (error) { next(error); }
};
