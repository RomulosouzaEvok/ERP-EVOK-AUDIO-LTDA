/**
 * Testes: middleware `authorizeSelfOrModule` (BLOCO 2 TI,
 * `docs/business/BLOCO_2_TI_API.md` §0). Cobre as 3 categorias de
 * autorização: admin, módulo com nível suficiente, e posse do recurso —
 * incluindo o caso de posse NEGADA (usuário sem módulo tentando acessar
 * chamado de terceiro).
 *
 * @group unit
 */

jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(async () => undefined),
}));

const { authorizeSelfOrModule } = require('../../src/middlewares/authorizeSelfOrModule');

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('authorizeSelfOrModule', () => {
  it('libera admin global mesmo sem modulo nem posse', async () => {
    const req: any = { user: { id: 1, role: 'admin', permissions: {} } };
    const res = makeRes();
    const next = jest.fn();
    const ownershipCheck = jest.fn(async () => false);

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(ownershipCheck).not.toHaveBeenCalled();
  });

  it('libera usuario com nivel de modulo suficiente (operate)', async () => {
    const req: any = { user: { id: 2, role: 'operator', permissions: { ti: 'operate' } } };
    const res = makeRes();
    const next = jest.fn();
    const ownershipCheck = jest.fn(async () => false);

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(ownershipCheck).not.toHaveBeenCalled();
  });

  it('libera "approve" quando o nivel do usuario e approve (approve >= operate implicito no proprio nivel)', async () => {
    const req: any = { user: { id: 2, role: 'operator', permissions: { ti: 'approve' } } };
    const res = makeRes();
    const next = jest.fn();
    const ownershipCheck = jest.fn(async () => false);

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('libera usuario SEM modulo nenhum quando ownershipCheck resolve true (posse do recurso, RNF-TI-02)', async () => {
    const req: any = { user: { id: 501, role: 'operator', permissions: {} } };
    const res = makeRes();
    const next = jest.fn();
    const ownershipCheck = jest.fn(async () => true);

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(ownershipCheck).toHaveBeenCalledWith(req);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: BLOQUEIA com 403 usuario sem modulo tentando acessar chamado de TERCEIRO (posse negada)', async () => {
    const req: any = { user: { id: 999, role: 'operator', permissions: {}, email: 'terceiro@evokaudio.com' } };
    const res = makeRes();
    const next = jest.fn();
    const ownershipCheck = jest.fn(async () => false);

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(ownershipCheck).toHaveBeenCalledWith(req);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'FORBIDDEN' }) }));
  });

  it('BLOQUEIA com 401 requisicao sem req.user', async () => {
    const req: any = {};
    const res = makeRes();
    const next = jest.fn();
    const ownershipCheck = jest.fn(async () => true);

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(ownershipCheck).not.toHaveBeenCalled();
  });

  it('propaga erro do ownershipCheck via next(error), sem responder 403 diretamente', async () => {
    const req: any = { user: { id: 1, role: 'operator', permissions: {} } };
    const res = makeRes();
    const next = jest.fn();
    const boom = new Error('boom');
    const ownershipCheck = jest.fn(async () => { throw boom; });

    await authorizeSelfOrModule('ti', 'operate', ownershipCheck)(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalled();
  });
});
