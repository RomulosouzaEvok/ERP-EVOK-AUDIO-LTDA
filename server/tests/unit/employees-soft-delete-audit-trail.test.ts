/**
 * Regressão `AUD-ALOG-01` item A — `DELETE /api/employees/:id` (desligamento
 * de funcionário) tem de deixar trilha de auditoria **com autor e origem**.
 *
 * Caso de remediação: `ERP-LEGACY-001-CASE-004` (SanaCore), autorizado por
 * `APR-2026-033`. Finding: `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/
 * AUD-ALOG-01.md` (CRITICAL, produção real).
 *
 * ## O que este arquivo prova, e por que cada asserção existe
 *
 * 1. **A trilha existe.** Antes da remediação o módulo `employees` tinha
 *    ZERO `logAction` em qualquer camada: a rota respondia 200 "desligado com
 *    sucesso" e `audit_logs` não recebia linha nenhuma. O primeiro teste
 *    reprova exatamente esse estado.
 * 2. **A trilha tem autor.** `logAction` extrai `user_id`, `user_name`,
 *    `user_ip`, `user_agent`, `route` e `method` **do `req`**
 *    (`src/models/AuditLog.ts:149-163`). Por isso a asserção não é "logAction
 *    foi chamado", é "logAction recebeu ESTE `req`". `AUD-ALOG-01` §7 é
 *    explícito: registro sem autor **não fecha o finding**.
 * 3. **A trilha não vaza dado pessoal.** `oldValues`/`newValues` ficam
 *    restritos a `status` e `dismissal_date`. Logar a entidade inteira
 *    despejaria salário, CPF, dados bancários e endereço em
 *    `audit_logs.old_values` — coluna `json` livre, sem mascaramento e sem
 *    imutabilidade —, violando `BR-RH-020` e `AUD-DB-08`. O teste falha se
 *    qualquer campo sensível aparecer no payload, em chave OU em valor.
 * 4. **Nada é logado quando o ato não aconteceu.** Se o gate de
 *    `HrTerminationProcess` (RF-RH-022) bloqueia o desligamento, não pode
 *    existir linha de `soft_delete` — trilha de um fato que não ocorreu é
 *    tão defeituosa quanto a ausência de trilha.
 * 5. **O contrato HTTP não mudou.** `{ success: true, data: { message } }`
 *    continua igual (`client/src/api/employees.ts:176` depende disso).
 *
 * Nenhuma conexão de banco é aberta por este teste (`APR-2026-016`): models,
 * repositório e serviço de auditoria são substituídos por dublês.
 *
 * @module tests/unit/employees-soft-delete-audit-trail
 * @ticket ERP-LEGACY-001-CASE-004 / AUD-ALOG-01 item A
 */

const mockLogAction = jest.fn();
const mockFindById = jest.fn();
const mockUpdate = jest.fn();
const mockTerminationCount = jest.fn();

jest.mock('../../src/services/auditLogService', () => ({
  logAction: mockLogAction,
}));

jest.mock('../../src/models/index', () => ({
  HrTerminationProcess: { count: mockTerminationCount },
}));

jest.mock(
  '../../src/modules/employees/infrastructure/sequelize/SequelizeEmployeesRepository',
  () =>
    class SequelizeEmployeesRepositoryDouble {
      findById = mockFindById;
      update = mockUpdate;
    },
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const employeeController = require('../../src/modules/employees/presentation/controllers/employeeController');

/** Funcionário com dados sensíveis presentes — se algum vazar para a trilha, o teste reprova. */
function funcionarioAtivo() {
  return {
    id: 501,
    name: 'Maria de Souza',
    status: 'active',
    dismissal_date: null,
    cpf: '12345678901',
    salary: '7350.00',
    bank_account: '00123456',
    bank_agency: '0001',
    pix_key: 'maria@exemplo.com',
    address: 'Rua das Flores, 100',
    phone: '11999998888',
  };
}

/** Mesmo funcionário depois do desligamento (estado realmente persistido). */
function funcionarioDesligado() {
  return { ...funcionarioAtivo(), status: 'inactive', dismissal_date: '2026-08-17' };
}

function fakeReq() {
  return {
    params: { id: '501' },
    user: { id: 7, name: 'Admin Teste', role: 'admin' },
    ip: '10.0.0.9',
    headers: { 'user-agent': 'jest' },
    originalUrl: '/api/employees/501',
    method: 'DELETE',
  } as any;
}

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() } as any;
}

describe('AUD-ALOG-01/A — DELETE /api/employees/:id registra trilha de auditoria', () => {
  beforeEach(() => {
    mockTerminationCount.mockResolvedValue(0);
    mockUpdate.mockResolvedValue(1);
    mockFindById
      .mockResolvedValueOnce(funcionarioAtivo())
      .mockResolvedValueOnce(funcionarioDesligado());
  });

  it('emite logAction com action=soft_delete e par oldValues/newValues', async () => {
    const req = fakeReq();
    const res = fakeRes();
    const next = jest.fn();

    await employeeController.remove(req, res, next);

    expect(next).not.toHaveBeenCalled();
    // ESTA é a asserção que reprova o estado anterior à remediação: o módulo
    // `employees` não chamava `logAction` em nenhuma camada.
    expect(mockLogAction).toHaveBeenCalledTimes(1);

    const params = mockLogAction.mock.calls[0][1];
    expect(params.action).toBe('soft_delete');
    expect(params.entityType).toBe('Employee');
    expect(params.entityId).toBe(501);
    expect(typeof params.entityId).toBe('number');
    expect(params.oldValues).toEqual({ status: 'active', dismissal_date: null });
    expect(params.newValues).toEqual({ status: 'inactive', dismissal_date: '2026-08-17' });
  });

  it('repassa o próprio req a logAction — sem autor e origem o finding não fecha', async () => {
    const req = fakeReq();
    const res = fakeRes();

    await employeeController.remove(req, res, jest.fn());

    // Identidade, não equivalência: é do `req` que `AuditLog.register` extrai
    // user_id, user_name, user_ip, user_agent, route e method.
    expect(mockLogAction.mock.calls[0][0]).toBe(req);
    expect(mockLogAction.mock.calls[0][0].user).toEqual(req.user);
  });

  it('não vaza dado pessoal sensível no payload da trilha (BR-RH-020 / AUD-DB-08)', async () => {
    const req = fakeReq();

    await employeeController.remove(req, fakeRes(), jest.fn());

    const params = mockLogAction.mock.calls[0][1];
    expect(Object.keys(params.oldValues).sort()).toEqual(['dismissal_date', 'status']);
    expect(Object.keys(params.newValues).sort()).toEqual(['dismissal_date', 'status']);

    // Varredura por VALOR em todo o payload (inclui entityDescription e
    // description): nenhum campo de SENSITIVE_EMPLOYEE_FIELDS pode aparecer.
    const serializado = JSON.stringify(params);
    for (const valorSensivel of [
      '12345678901', // cpf
      '7350.00', // salary
      '00123456', // bank_account
      '0001', // bank_agency
      'maria@exemplo.com', // pix_key
      'Rua das Flores, 100', // address
      '11999998888', // phone
    ]) {
      expect(serializado).not.toContain(valorSensivel);
    }
    for (const chaveSensivel of ['cpf', 'salary', 'bank_account', 'bank_agency', 'pix_key', 'address', 'phone']) {
      expect(serializado).not.toContain(`"${chaveSensivel}"`);
    }
  });

  it('preserva o contrato HTTP da rota (mensagem e envelope inalterados)', async () => {
    const res = fakeRes();

    await employeeController.remove(fakeReq(), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { message: 'Funcionário desligado com sucesso' },
    });
  });

  it('não registra soft_delete quando o gate de demissão formal bloqueia o ato (RF-RH-022)', async () => {
    mockTerminationCount.mockResolvedValue(1);
    const next = jest.fn();

    await employeeController.remove(fakeReq(), fakeRes(), next);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }));
  });
});
