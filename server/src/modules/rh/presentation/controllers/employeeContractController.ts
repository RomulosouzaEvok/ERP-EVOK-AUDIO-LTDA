import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 3 — Contrato de Experiência
 * (`/api/rh/employee-contracts`, §5 do contrato de API, UC-68, RF-RH-013 a
 * 016, **P0**).
 *
 * Não existe `POST /employee-contracts` avulso (§5, nota): o contrato
 * inicial nasce sempre dentro de `POST /admission-processes/:id/conclude`.
 * Também não existe `DELETE` — `hr_employee_contracts` é imutável por
 * natureza de auditoria trabalhista (RNF-RH-04, trigger
 * `hr_lock_employee_contract`).
 *
 * @module modules/rh/presentation/controllers/employeeContractController
 */

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');

const SequelizeEmployeeContractRepository = require('../../infrastructure/sequelize/SequelizeEmployeeContractRepository');
const SequelizeTerminationProcessRepository = require('../../infrastructure/sequelize/SequelizeTerminationProcessRepository');

const ListEmployeeContractsUseCase = require('../../application/use-cases/contract/ListEmployeeContractsUseCase');
const GetEmployeeContractByIdUseCase = require('../../application/use-cases/contract/GetEmployeeContractByIdUseCase');
const ExtendEmployeeContractUseCase = require('../../application/use-cases/contract/ExtendEmployeeContractUseCase');
const DecideEmployeeContractUseCase = require('../../application/use-cases/contract/DecideEmployeeContractUseCase');
const CreateTerminationProcessUseCase = require('../../application/use-cases/termination/CreateTerminationProcessUseCase');

const { extendContractSchema, decideContractSchema, listContractQuerySchema } = require('../validators/employeeContractValidators');

const contractRepository = new SequelizeEmployeeContractRepository();
const terminationRepository = new SequelizeTerminationProcessRepository();

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/**
 * `GET /api/rh/employee-contracts` — lista paginada.
 *
 * Verificação ativa (RNF-RH-02/RF-RH-016, UC-68 E1): cada linha passa por
 * `applyAutoExpireIfNeeded` dentro do use case — um contrato de experiência
 * vencido sem decisão vira `indeterminado_automatico` já na leitura, sem
 * depender de cron. Art. 451, CLT.
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listContractQuerySchema.parse(req.query);
    const result = await new ListEmployeeContractsUseCase(contractRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/employee-contracts/:id` — detalhe (com a mesma verificação ativa de vencimento). */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetEmployeeContractByIdUseCase(contractRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PATCH /api/rh/employee-contracts/:id/extend` — RF-RH-014/015 (Art. 445 § único e Art. 451, CLT). */
exports.extend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = extendContractSchema.parse(req.body);
    const data = await new ExtendEmployeeContractUseCase(contractRepository).execute({ id: req.params.id, ...parsed });
    logAction(req, {
      action: 'update', entityType: 'HrEmployeeContract', entityId: Number(req.params.id),
      newValues: parsed, description: `Contrato de experiência prorrogado até ${parsed.period_2_end_date} (única prorrogação — Art. 451, CLT)`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/**
 * `PATCH /api/rh/employee-contracts/:id/decision` — RF-RH-016.
 *
 * `decision='rescindir'` exige `rh:approve` — verificado no router por um
 * middleware condicional (§5.2: `403 FORBIDDEN` quando falta o nível),
 * nunca aqui.
 */
exports.decide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = decideContractSchema.parse(req.body);
    const useCase = new DecideEmployeeContractUseCase(
      contractRepository,
      new CreateTerminationProcessUseCase(terminationRepository),
      new ExtendEmployeeContractUseCase(contractRepository),
    );
    const data = await useCase.execute({ id: req.params.id, ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrEmployeeContract', entityId: Number(req.params.id),
      newValues: parsed, description: `Decisão sobre contrato de experiência: ${parsed.decision}`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
