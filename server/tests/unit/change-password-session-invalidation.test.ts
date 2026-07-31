jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => {
      const transaction = { id: 'tx-change-password', LOCK: { UPDATE: 'UPDATE' } };
      return callback(transaction);
    }),
  },
}));

import ChangePasswordUseCase = require('../../src/modules/auth/application/use-cases/ChangePasswordUseCase');
import { NotFoundError, UnauthorizedError, ValidationError } from '../../src/errors';

function buildUserStub(overrides: Partial<{ password: string; passwordVersion: number }> = {}) {
  const state = {
    id: 42,
    password: overrides.password ?? 'old-hash',
    passwordVersion: overrides.passwordVersion ?? 1,
  };

  return {
    get id() {
      return state.id;
    },
    get passwordVersion() {
      return state.passwordVersion;
    },
    set password(value: string) {
      // Simula o hook beforeSave do model User: ao alterar a senha em um
      // registro existente, incrementa passwordVersion automaticamente.
      state.password = value;
      state.passwordVersion += 1;
    },
    get password() {
      return state.password;
    },
    comparePassword: jest.fn(async (candidate: string) => candidate === 'senha-atual-correta'),
    save: jest.fn(async () => undefined),
  };
}

describe('ChangePasswordUseCase (SEC-09 + SEC-10)', () => {
  it('troca a senha e incrementa passwordVersion, invalidando tokens antigos', async () => {
    const user = buildUserStub({ passwordVersion: 1 });
    const authRepository = {
      findUserByIdWithPasswordForUpdate: jest.fn(async () => user),
    };

    const useCase = new ChangePasswordUseCase(authRepository as any);
    const result = await useCase.execute({
      userId: 42,
      currentPassword: 'senha-atual-correta',
      newPassword: 'nova-senha-123',
    });

    expect(authRepository.findUserByIdWithPasswordForUpdate).toHaveBeenCalledWith(42, expect.objectContaining({ id: 'tx-change-password' }));
    expect(user.save).toHaveBeenCalledWith(expect.objectContaining({ transaction: expect.objectContaining({ id: 'tx-change-password' }) }));
    expect(result.passwordVersion).toBe(2);
  });

  it('rejeita a troca quando a senha atual esta incorreta', async () => {
    const user = buildUserStub({ passwordVersion: 5 });
    const authRepository = {
      findUserByIdWithPasswordForUpdate: jest.fn(async () => user),
    };

    const useCase = new ChangePasswordUseCase(authRepository as any);

    await expect(useCase.execute({
      userId: 42,
      currentPassword: 'senha-errada',
      newPassword: 'nova-senha-123',
    })).rejects.toBeInstanceOf(UnauthorizedError);

    expect(user.save).not.toHaveBeenCalled();
    expect(user.passwordVersion).toBe(5);
  });

  it('rejeita quando a nova senha e igual a atual', async () => {
    const user = buildUserStub({ passwordVersion: 1 });
    const authRepository = {
      findUserByIdWithPasswordForUpdate: jest.fn(async () => user),
    };

    const useCase = new ChangePasswordUseCase(authRepository as any);

    await expect(useCase.execute({
      userId: 42,
      currentPassword: 'senha-atual-correta',
      newPassword: 'senha-atual-correta',
    })).rejects.toBeInstanceOf(ValidationError);

    expect(user.save).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError quando o usuario nao existe', async () => {
    const authRepository = {
      findUserByIdWithPasswordForUpdate: jest.fn(async () => null),
    };

    const useCase = new ChangePasswordUseCase(authRepository as any);

    await expect(useCase.execute({
      userId: 999,
      currentPassword: 'x',
      newPassword: 'y-novo',
    })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('authenticate middleware — invalidacao de sessao por passwordVersion (SEC-10)', () => {
  const JWT_SECRET = 'a'.repeat(32);

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_EXPIRE = '7d';
  });

  function loadMiddlewareWithUser(userStub: any) {
    jest.doMock('../../src/models/index', () => ({
      User: {
        findByPk: jest.fn(async () => userStub),
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authModule = require('../../src/middlewares/auth');
    return authModule.authenticate as (req: any, res: any, next: any) => Promise<void>;
  }

  function buildResMock() {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  }

  it('rejeita com 401 um token emitido antes da troca de senha (passwordVersion desatualizado)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');

    const oldToken = jwt.sign({ id: 42, passwordVersion: 1 }, JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'erp-evok-audio',
      audience: 'erp-evok-audio-api',
    });

    const authenticate = loadMiddlewareWithUser({
      id: 42,
      name: 'Usuario Teste',
      email: 'teste@evok.local',
      role: 'operator',
      active: true,
      passwordVersion: 2, // senha ja foi trocada apos a emissao do token acima
    });

    const req: any = { headers: { authorization: `Bearer ${oldToken}` } };
    const res = buildResMock();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('aceita um token emitido apos a troca de senha (passwordVersion atualizado)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');

    const freshToken = jwt.sign({ id: 42, passwordVersion: 2 }, JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'erp-evok-audio',
      audience: 'erp-evok-audio-api',
    });

    const authenticate = loadMiddlewareWithUser({
      id: 42,
      name: 'Usuario Teste',
      email: 'teste@evok.local',
      role: 'operator',
      active: true,
      passwordVersion: 2,
    });

    const req: any = { headers: { authorization: `Bearer ${freshToken}` } };
    const res = buildResMock();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual(expect.objectContaining({ id: 42, email: 'teste@evok.local' }));
  });
});
