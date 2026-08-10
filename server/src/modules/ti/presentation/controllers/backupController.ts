/**
 * Controller do cluster Backup e Continuidade (P5,
 * `docs/business/BLOCO_2_TI_API.md` §5).
 *
 * @module modules/ti/presentation/controllers/backupController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeBackupLogRepository = require('../../infrastructure/sequelize/SequelizeBackupLogRepository');
const SequelizeTicketRepository = require('../../infrastructure/sequelize/SequelizeTicketRepository');
const SequelizeTiSettingsRepository = require('../../infrastructure/sequelize/SequelizeTiSettingsRepository');

const RegisterBackupLogUseCase = require('../../application/use-cases/backup/RegisterBackupLogUseCase');
const ListBackupLogsUseCase = require('../../application/use-cases/backup/ListBackupLogsUseCase');
const CheckBackupHealthUseCase = require('../../application/use-cases/backup/CheckBackupHealthUseCase');
const { registerBackupLogSchema, handleZodError } = require('../validators/backupValidators');

const backupLogRepository = new SequelizeBackupLogRepository();
const ticketRepository = new SequelizeTicketRepository();
const settingsRepository = new SequelizeTiSettingsRepository();

/** `GET /api/ti/backup-logs` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListBackupLogsUseCase(backupLogRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/ti/backup-logs` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerBackupLogSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const data = await new RegisterBackupLogUseCase(backupLogRepository, ticketRepository, settingsRepository).execute(parsed.data);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/ti/backup-logs/health` — precisa vir ANTES de nenhuma rota `:id` (não existe aqui, mas mantém o padrão do projeto). */
exports.health = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CheckBackupHealthUseCase(backupLogRepository, settingsRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
