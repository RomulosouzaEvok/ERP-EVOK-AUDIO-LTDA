import type { Request, Response, NextFunction } from 'express';

const SequelizeEmployeesRepository = require('../../infrastructure/sequelize/SequelizeEmployeesRepository');
const ListEmployeesUseCase = require('../../application/use-cases/ListEmployeesUseCase');
const GetEmployeeByIdUseCase = require('../../application/use-cases/GetEmployeeByIdUseCase');
const CreateEmployeeUseCase = require('../../application/use-cases/CreateEmployeeUseCase');
const UpdateEmployeeUseCase = require('../../application/use-cases/UpdateEmployeeUseCase');
const DeactivateEmployeeUseCase = require('../../application/use-cases/DeactivateEmployeeUseCase');

/**
 * BLOCO 6 RH (pendência #13 da auditoria) — checagem read-only de
 * `HrTerminationProcess` aberto, sem acoplar `employees` ao módulo `rh`
 * (nenhum use-case/repositório de `modules/rh` é importado aqui, apenas o
 * model Sequelize compartilhado via `models/index`, mesmo padrão de baixo
 * acoplamento já usado entre outros módulos deste projeto).
 */
const terminationProcessChecker = {
  async hasOpenTerminationProcess(employeeId: number | string): Promise<boolean> {
    const { HrTerminationProcess } = require('../../../../models/index');
    const { Op } = require('sequelize');
    const count = await HrTerminationProcess.count({
      where: { employee_id: employeeId, status: { [Op.notIn]: ['concluido', 'cancelado'] } },
    });
    return count > 0;
  },
};

/**
 * Controller enxuto do módulo `employees`. Delega toda a regra de negócio
 * aos use cases da camada de aplicação, mantendo o mesmo contrato JSON e os
 * mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/employeeController.ts`).
 */
const employeesRepository = new SequelizeEmployeesRepository();

/**
 * `GET /api/employees` — lista funcionários (busca/filtro/paginação).
 *
 * Acessível a qualquer usuário autenticado; campos sensíveis (salário, CPF,
 * dados bancários, endereço, telefone — BR-RH-020) só são incluídos na
 * resposta para `role === 'admin'` ou perfis com o módulo `rh` atribuído
 * (ver `employeeSensitiveFields.hasFullEmployeeAccess`).
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListEmployeesUseCase(employeesRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute({
      ...req.query,
      requestingUser: (req as any).user,
    });
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/employees/:id` — busca um funcionário pelo id.
 *
 * Mesma segregação de campos sensíveis de `list` (BR-RH-020).
 */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetEmployeeByIdUseCase(employeesRepository);
    const employee = await useCase.execute({ id: req.params.id, requestingUser: (req as any).user });
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/employees` — cria um novo funcionário. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateEmployeeUseCase(employeesRepository);
    const employee = await useCase.execute(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/employees/:id` — atualiza um funcionário existente. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new UpdateEmployeeUseCase(employeesRepository);
    const employee = await useCase.execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/employees/:id` — desliga (soft delete) um funcionário. */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new DeactivateEmployeeUseCase(employeesRepository, terminationProcessChecker);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
