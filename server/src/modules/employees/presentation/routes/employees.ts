const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const employeeController = require('../controllers/employeeController');

/**
 * Rotas do módulo `employees` (Clean Architecture), montadas sob
 * `/api/employees` em `server/app.ts`. Escrita (`POST`/`PUT`/`DELETE`)
 * restrita a `admin`. Leitura (`GET`) exige apenas sessão autenticada — a
 * segregação de campos sensíveis de RH (salário, CPF, dados bancários,
 * endereço, telefone — BR-RH-020) acontece dentro dos use cases
 * (`ListEmployeesUseCase`/`GetEmployeeByIdUseCase`, via
 * `employeeSensitiveFields.hasFullEmployeeAccess`), não no roteamento: a
 * rota continua liberada para consumidores legítimos que só precisam de
 * nome/departamento/cargo (ex.: seletor de operador do apontamento,
 * resolução de departamento do usuário logado).
 */

router.get('/', authenticate, employeeController.list);
router.get('/:id', authenticate, employeeController.getById);
router.post('/', authenticate, authorize('admin'), employeeController.create);
router.put('/:id', authenticate, authorize('admin'), employeeController.update);
router.delete('/:id', authenticate, authorize('admin'), employeeController.remove);

module.exports = router;
