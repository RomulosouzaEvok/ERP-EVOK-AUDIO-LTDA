/**
 * Testes de `POST /api/auth/refresh` (renovacao deslizante de sessao, para
 * o painel de TV "sempre ligado"): compoe o middleware `authenticate` real
 * (SEC-10: rejeita token expirado ou com `passwordVersion` desatualizado)
 * com o handler `authController.refresh`, exatamente como a rota monta em
 * `src/modules/auth/presentation/routes/auth.ts`.
 */

const JWT_SECRET = 'a'.repeat(32);
const JWT_ISSUER = 'erp-evok-audio';
const JWT_AUDIENCE = 'erp-evok-audio-api';

function buildResMock() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_EXPIRE = '7d';
  });

  function loadAuthenticateWithUser(userStub: any) {
    jest.doMock('../../src/models/index', () => ({
      User: {
        findByPk: jest.fn(async () => userStub),
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authModule = require('../../src/middlewares/auth');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authController = require('../../src/modules/auth/presentation/controllers/authController');
    return {
      authenticate: authModule.authenticate as (req: any, res: any, next: any) => Promise<void>,
      refresh: authController.refresh as (req: any, res: any, next: any) => Promise<void>,
    };
  }

  it('devolve um token novo e valido, preservando id/passwordVersion/iss/aud', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');

    const { authenticate, refresh } = loadAuthenticateWithUser({
      id: 42,
      name: 'Usuario Teste',
      email: 'teste@evok.local',
      role: 'operator',
      active: true,
      passwordVersion: 3,
    });

    const validToken = jwt.sign({ id: 42, passwordVersion: 3 }, JWT_SECRET, {
      expiresIn: '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const req: any = { headers: { authorization: `Bearer ${validToken}` } };
    const res = buildResMock();
    const next = jest.fn();

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    await refresh(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ token: expect.any(String) }),
      }),
    );

    // Nao comparamos newToken !== validToken por igualdade de string: `iat`
    // tem granularidade de segundos, entao um refresh no mesmo segundo do
    // login pode gerar um JWT byte-a-byte identico ao original sem que isso
    // indique qualquer falha — o que importa e que o token devolvido e
    // valido e carrega as claims corretas (verificado abaixo).
    const newToken = res.json.mock.calls[0][0].data.token;
    const decoded: any = jwt.verify(newToken, JWT_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    expect(decoded.id).toBe(42);
    expect(decoded.passwordVersion).toBe(3);
    expect(decoded.iss).toBe(JWT_ISSUER);
    expect(decoded.aud).toBe(JWT_AUDIENCE);
  });

  it('rejeita com 401 quando o token atual ja esta expirado (sem renovacao — relogin necessario)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');

    const { authenticate, refresh } = loadAuthenticateWithUser({
      id: 42,
      name: 'Usuario Teste',
      email: 'teste@evok.local',
      role: 'operator',
      active: true,
      passwordVersion: 1,
    });

    const expiredToken = jwt.sign({ id: 42, passwordVersion: 1 }, JWT_SECRET, {
      expiresIn: -10,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = buildResMock();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();

    // Handler de refresh nunca roda: o middleware ja respondeu 401.
    await refresh(req, res, next);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('rejeita com 401 quando o passwordVersion do token esta desatualizado (senha trocada apos emissao)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');

    const { authenticate, refresh } = loadAuthenticateWithUser({
      id: 42,
      name: 'Usuario Teste',
      email: 'teste@evok.local',
      role: 'operator',
      active: true,
      passwordVersion: 2,
    });

    const staleToken = jwt.sign({ id: 42, passwordVersion: 1 }, JWT_SECRET, {
      expiresIn: '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const req: any = { headers: { authorization: `Bearer ${staleToken}` } };
    const res = buildResMock();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();

    await refresh(req, res, next);
    expect(res.json).toHaveBeenCalledTimes(1);
  });
});
