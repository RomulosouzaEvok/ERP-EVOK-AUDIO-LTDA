const SequelizeAuditLogsRepository = require('../../infrastructure/sequelize/SequelizeAuditLogsRepository');
const ListAuditLogsUseCase = require('../../application/use-cases/ListAuditLogsUseCase');
const GetAuditLogByIdUseCase = require('../../application/use-cases/GetAuditLogByIdUseCase');

/**
 * Controller enxuto do módulo `auditLogs`. Delega toda a regra de negócio
 * aos use cases da camada de aplicação, mantendo o mesmo contrato JSON e os
 * mesmos 2 endpoints do controller anterior
 * (`server/src/controllers/auditLogController.ts`).
 */
const auditLogsRepository = new SequelizeAuditLogsRepository();

/** `GET /api/audit-logs` — lista logs de auditoria com filtros e paginação. */
exports.list = async (req, res, next) => {
  try {
    const useCase = new ListAuditLogsUseCase(auditLogsRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/audit-logs/:id` — busca um log de auditoria pelo id. */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetAuditLogByIdUseCase(auditLogsRepository);
    const log = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
