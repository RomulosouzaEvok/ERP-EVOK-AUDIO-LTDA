import type { Request, Response, NextFunction } from 'express';

const { logAction } = require('../../../../services/auditLogService');
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

/**
 * `DELETE /api/employees/:id` — desliga (soft delete) um funcionário.
 *
 * ## Trilha de auditoria (AUD-ALOG-01 item A — CASE-004, APR-2026-033)
 *
 * Desligamento é ato de efeito trabalhista e esta rota respondia 200
 * "desligado com sucesso" **sem deixar registro de quem fez, quando e de
 * onde** — o módulo `employees` não tinha `logAction` em nenhuma camada. O
 * `logAction` fica aqui, no controller, porque é aqui que existe o `req`: é
 * dele que `AuditLog.register` extrai `user_id`, `user_name`, `user_ip`,
 * `user_agent`, `route` e `method` (`src/models/AuditLog.ts:149-163`).
 * Registrar a ação sem autor não resolveria o finding — autoria é exatamente
 * o que faltava. Padrão de referência:
 * `modules/products/.../productController.ts` (`remove`).
 *
 * O estado anterior é lido AQUI, e não devolvido pelo use case, para não
 * mudar a assinatura/retorno de `DeactivateEmployeeUseCase` (contrato
 * `{ message }` consumido por `client/src/api/employees.ts` e pelos testes
 * do use case). O estado posterior também é relido, para que `newValues`
 * reflita o que foi de fato persistido (`dismissal_date` é `DATEONLY`) em
 * vez de um valor recalculado aqui.
 *
 * 🔒 **Privacidade (BR-RH-020 / LGPD, e AUD-DB-08):** `oldValues`/`newValues`
 * carregam **somente** `status` e `dismissal_date`, e `entityDescription`
 * usa o nome funcional — nunca CPF. `audit_logs.old_values`/`new_values` são
 * colunas `json` livres, sem mascaramento e legíveis por quem consulta a
 * trilha: logar a entidade inteira despejaria salário, CPF, dados bancários
 * e endereço ali, trocando um defeito de auditoria por um vazamento.
 *
 * Nota de não-atomicidade: a pré-leitura e a escrita não são atômicas — em
 * corrida entre dois desligamentos do mesmo funcionário, `oldValues` pode
 * refletir estado já sobrescrito. É o mesmo comportamento de todo o padrão
 * de auditoria já existente no repositório (`productController`,
 * `DeactivateUserUseCase`), registrado aqui para não ser surpresa.
 */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await employeesRepository.findById(req.params.id);

    const useCase = new DeactivateEmployeeUseCase(employeesRepository, terminationProcessChecker);
    const result = await useCase.execute({ id: req.params.id });

    // Só chega aqui se o desligamento realmente ocorreu: o gate de
    // `HrTerminationProcess` (RF-RH-022) e o `NotFoundError` lançam antes.
    const after = await employeesRepository.findById(req.params.id);

    logAction(req, {
      action: 'soft_delete',
      entityType: 'Employee',
      entityId: Number(before?.id ?? req.params.id),
      entityDescription: before?.name ?? `Funcionário #${req.params.id}`,
      oldValues: {
        status: before?.status ?? null,
        dismissal_date: before?.dismissal_date ?? null,
      },
      newValues: {
        status: after?.status ?? 'inactive',
        dismissal_date: after?.dismissal_date ?? null,
      },
      description: `Funcionário ${before?.name ?? `#${req.params.id}`} desligado (soft delete) via DELETE /api/employees/:id`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
