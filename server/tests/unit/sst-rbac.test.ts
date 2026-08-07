/**
 * Testes: RBAC do módulo SST (chave `sst`, exceção `sst`|`rh`).
 *
 * Cobre a checagem inline `requireSstOrRh` usada pelas 2 rotas de leitura
 * enxuta cross-módulo (`GET /aso/status/:employeeId` e, quando o cluster
 * CIPA for implementado, `GET /cipa/stability/:employeeId`) — mesmo
 * padrão de checagem redundante já documentado para Requisição de Compra
 * (`docs/arquitetura/API.md` §15). A regra geral (`authorizeModule('sst')`
 * bloqueando o restante do módulo) já é coberta pelo guard genérico
 * `tests/unit/module-authorization-map.test.ts`.
 *
 * @group unit
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sstRouter = require('../../src/modules/sst/presentation/routes/sst');

describe('requireSstOrRh (exceção sst|rh)', () => {
  function makeRes() {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  }

  it('libera admin global mesmo sem o modulo sst/rh atribuido', () => {
    const req: any = { user: { role: 'admin', permissions: {} } };
    const res = makeRes();
    const next = jest.fn();

    sstRouter.requireSstOrRh(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('libera usuario com permissao do modulo sst', () => {
    const req: any = { user: { role: 'operator', permissions: { sst: 'operate' } } };
    const res = makeRes();
    const next = jest.fn();

    sstRouter.requireSstOrRh(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('libera usuario com permissao do modulo rh (consumo pelo RH, RF-SST-021/031)', () => {
    const req: any = { user: { role: 'operator', permissions: { rh: 'operate' } } };
    const res = makeRes();
    const next = jest.fn();

    sstRouter.requireSstOrRh(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('BLOQUEIA usuario sem sst e sem rh com 403 FORBIDDEN', () => {
    const req: any = { user: { role: 'operator', permissions: { vendas: 'operate' } } };
    const res = makeRes();
    const next = jest.fn();

    sstRouter.requireSstOrRh(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'FORBIDDEN' }) }));
  });

  it('BLOQUEIA requisicao sem req.user (antes de authenticate) com 401', () => {
    const req: any = {};
    const res = makeRes();
    const next = jest.fn();

    sstRouter.requireSstOrRh(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
