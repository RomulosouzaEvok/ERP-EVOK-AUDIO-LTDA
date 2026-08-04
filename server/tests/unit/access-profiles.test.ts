/**
 * Testes unitários do Bloco 1.2 (Perfis de Acesso Configuráveis — UC-30 a
 * UC-38): middleware `authorizeModule` e use cases de CRUD/atribuição de
 * perfil.
 */

jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const mockAccessProfileFindByPk = jest.fn();
jest.mock('../../src/models/index', () => ({
  AccessProfile: { findByPk: (...args: unknown[]) => mockAccessProfileFindByPk(...args) },
}));

import { authorizeModule } from '../../src/middlewares/auth';
import { logAction } from '../../src/services/auditLogService';
import { ConflictError, NotFoundError, ValidationError, BusinessRuleError } from '../../src/errors';

import ListAccessProfilesUseCase = require('../../src/modules/accessProfiles/application/use-cases/ListAccessProfilesUseCase');
import CreateAccessProfileUseCase = require('../../src/modules/accessProfiles/application/use-cases/CreateAccessProfileUseCase');
import UpdateAccessProfileUseCase = require('../../src/modules/accessProfiles/application/use-cases/UpdateAccessProfileUseCase');
import DeactivateAccessProfileUseCase = require('../../src/modules/accessProfiles/application/use-cases/DeactivateAccessProfileUseCase');
import AssignAccessProfileUseCase = require('../../src/modules/users/application/use-cases/AssignAccessProfileUseCase');

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(user?: any) {
  return { user, email: undefined } as any;
}

const fakeReq = { user: { id: 1, email: 'admin@evokaudio.com' } } as any;

// -----------------------------------------------------------------------
// Middleware authorizeModule
// -----------------------------------------------------------------------

describe('authorizeModule (middleware)', () => {
  beforeEach(() => {
    (logAction as jest.Mock).mockClear();
  });

  it('admin global sempre passa, mesmo sem perfil de acesso (§3)', () => {
    const req = mockReq({ role: 'admin', accessProfileId: null, accessProfileName: null, permissions: {} });
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('usuario sem access_profile_id recebe 403 NO_ACCESS_PROFILE com aviso didatico (UC-35-Exceção)', () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: null,
      accessProfileName: null,
      permissions: {},
      email: 'novo@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NO_ACCESS_PROFILE',
        message: 'Seu acesso ainda não foi configurado — procure o administrador.',
      },
    });
    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({ action: 'access_denied', success: false }),
    );
  });

  it('usuario com perfil mas sem o modulo solicitado recebe 403 MODULE_ACCESS_DENIED', () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 5,
      accessProfileName: 'Expedição',
      permissions: { expedicao: 'operate' },
      email: 'expedicao@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(body.error.message).toContain('laboratorio');
  });

  it("nivel 'operate' nao autoriza acao que exige 'approve' (APPROVAL_LEVEL_REQUIRED)", () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 7,
      accessProfileName: 'Analista de Laboratório',
      permissions: { laboratorio: 'operate' },
      email: 'analista@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio', 'approve')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'APPROVAL_LEVEL_REQUIRED',
        message: 'Esta ação exige nível gestor da área.',
      },
    });
  });

  it("nivel 'approve' no modulo autoriza acao que exige 'approve'", () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 7,
      accessProfileName: 'Analista de Laboratório',
      permissions: { laboratorio: 'approve' },
      email: 'gestor.lab@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio', 'approve')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("nivel 'operate' autoriza acao comum de escrita (requiredLevel default 'operate')", () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 7,
      accessProfileName: 'Analista de Laboratório',
      permissions: { laboratorio: 'operate' },
      email: 'analista@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio', 'operate')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responde 401 se nao houver req.user (authenticate nao rodou antes)', () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = jest.fn();

    authorizeModule('laboratorio')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// -----------------------------------------------------------------------
// CRUD de Perfis de Acesso (UC-30 a UC-32)
// -----------------------------------------------------------------------

describe('CreateAccessProfileUseCase (UC-30)', () => {
  it('rejeita nome duplicado com ConflictError (409)', async () => {
    const repo = {
      findByNome: jest.fn(async () => ({ id: 1 })),
      create: jest.fn(),
    };
    const useCase = new CreateAccessProfileUseCase(repo as any);

    await expect(
      useCase.execute({
        nome: 'Almoxarife',
        permissions: [{ module: 'estoque', level: 'operate' }],
        req: fakeReq,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejeita perfil sem nenhuma permissao (422 ValidationError)', async () => {
    const repo = { findByNome: jest.fn(async () => null), create: jest.fn() };
    const useCase = new CreateAccessProfileUseCase(repo as any);

    await expect(
      useCase.execute({ nome: 'Vazio', permissions: [], req: fakeReq }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejeita module key invalido', async () => {
    const repo = { findByNome: jest.fn(async () => null), create: jest.fn() };
    const useCase = new CreateAccessProfileUseCase(repo as any);

    await expect(
      useCase.execute({
        nome: 'Perfil X',
        permissions: [{ module: 'modulo_inexistente', level: 'operate' }],
        req: fakeReq,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('cria perfil valido e audita com logAction', async () => {
    const created = {
      id: 10,
      nome: 'Almoxarife',
      descricao: null,
      allowedWarehouses: null,
      active: true,
      permissions: [{ module: 'estoque', level: 'operate' }],
      userCount: 0,
    };
    const repo = {
      findByNome: jest.fn(async () => null),
      create: jest.fn(async () => created),
    };
    const useCase = new CreateAccessProfileUseCase(repo as any);

    const result = await useCase.execute({
      nome: 'Almoxarife',
      permissions: [{ module: 'estoque', level: 'operate' }],
      req: fakeReq,
    });

    expect(result.id).toBe(10);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Almoxarife' }),
      [{ module: 'estoque', level: 'operate' }],
    );
    expect(logAction).toHaveBeenCalledWith(
      fakeReq,
      expect.objectContaining({ action: 'create', entityType: 'AccessProfile', entityId: 10 }),
    );
  });
});

describe('UpdateAccessProfileUseCase (UC-31)', () => {
  it('lanca NotFoundError se perfil nao existir', async () => {
    const repo = { findById: jest.fn(async () => null) };
    const useCase = new UpdateAccessProfileUseCase(repo as any);

    await expect(
      useCase.execute({ id: 999, permissions: [{ module: 'estoque', level: 'operate' }], req: fakeReq }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('audita oldValues e newValues completos da matriz de permissoes (§5)', async () => {
    const before = {
      id: 1,
      nome: 'Almoxarife',
      descricao: null,
      allowedWarehouses: null,
      active: true,
      permissions: [{ module: 'compras', level: 'operate' }],
      userCount: 3,
    };
    const after = { ...before, permissions: [] as any[] };

    const repo = {
      findById: jest.fn(async () => before),
      findByNome: jest.fn(async () => null),
      update: jest.fn(async () => after),
    };
    const useCase = new UpdateAccessProfileUseCase(repo as any);

    await useCase.execute({ id: 1, permissions: [{ module: 'compras', level: 'approve' }], req: fakeReq });

    expect(logAction).toHaveBeenCalledWith(
      fakeReq,
      expect.objectContaining({
        action: 'update',
        oldValues: expect.objectContaining({ permissions: [{ module: 'compras', level: 'operate' }] }),
        newValues: expect.objectContaining({ permissions: [{ module: 'compras', level: 'approve' }] }),
      }),
    );
  });
});

describe('DeactivateAccessProfileUseCase (UC-32)', () => {
  it('bloqueia desativacao com 422 quando ha usuarios ativos vinculados, listando-os', async () => {
    const profile = {
      id: 2,
      nome: 'Comprador',
      descricao: null,
      allowedWarehouses: null,
      active: true,
      permissions: [],
      userCount: 2,
    };
    const repo = {
      findById: jest.fn(async () => profile),
      countActiveUsers: jest.fn(async () => ({
        count: 2,
        users: [
          { id: 1, name: 'Joao', email: 'joao@evokaudio.com' },
          { id: 2, name: 'Maria', email: 'maria@evokaudio.com' },
        ],
      })),
      deactivate: jest.fn(),
    };
    const useCase = new DeactivateAccessProfileUseCase(repo as any);

    await expect(useCase.execute({ id: 2, req: fakeReq })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.deactivate).not.toHaveBeenCalled();

    try {
      await useCase.execute({ id: 2, req: fakeReq });
    } catch (error: any) {
      expect(error.details.userCount).toBe(2);
      expect(error.details.users).toHaveLength(2);
    }
  });

  it('desativa perfil sem usuarios ativos vinculados', async () => {
    const profile = {
      id: 3,
      nome: 'Analista de Comex',
      descricao: null,
      allowedWarehouses: null,
      active: true,
      permissions: [],
      userCount: 0,
    };
    const repo = {
      findById: jest.fn(async () => profile),
      countActiveUsers: jest.fn(async () => ({ count: 0, users: [] })),
      deactivate: jest.fn(async () => true),
    };
    const useCase = new DeactivateAccessProfileUseCase(repo as any);

    const result = await useCase.execute({ id: 3, req: fakeReq });

    expect(result).toEqual({ id: 3, nome: 'Analista de Comex', active: false });
    expect(repo.deactivate).toHaveBeenCalledWith(3);
    expect(logAction).toHaveBeenCalledWith(
      fakeReq,
      expect.objectContaining({ action: 'deactivate', entityType: 'AccessProfile', entityId: 3 }),
    );
  });
});

// -----------------------------------------------------------------------
// Atribuicao de Perfil a Usuario (UC-33)
// -----------------------------------------------------------------------

describe('AssignAccessProfileUseCase (UC-33)', () => {
  beforeEach(() => {
    mockAccessProfileFindByPk.mockReset();
  });

  it('audita atribuicao com valor anterior e novo valor', async () => {
    mockAccessProfileFindByPk.mockResolvedValue({ id: 9, nome: 'Laboratório', active: true });

    const usersRepository = {
      findById: jest.fn(async () => ({ id: 1, email: 'usuario@evokaudio.com', accessProfileId: 5 })),
      update: jest.fn(async () => 1),
    };

    const useCase = new AssignAccessProfileUseCase(usersRepository as any);
    const result = await useCase.execute({ id: 1, accessProfileId: 9, req: fakeReq });

    expect(result).toEqual({ id: 1, accessProfileId: 9 });
    expect(usersRepository.update).toHaveBeenCalledWith(1, { accessProfileId: 9 });
    expect(logAction).toHaveBeenCalledWith(
      fakeReq,
      expect.objectContaining({
        action: 'assign',
        entityType: 'UserAccessAssignment',
        oldValues: { accessProfileId: 5 },
        newValues: { accessProfileId: 9 },
      }),
    );
  });

  it('rejeita atribuicao de perfil inativo com BusinessRuleError (422)', async () => {
    mockAccessProfileFindByPk.mockResolvedValue({ id: 9, nome: 'Antigo', active: false });

    const usersRepository = {
      findById: jest.fn(async () => ({ id: 1, email: 'usuario@evokaudio.com', accessProfileId: null })),
      update: jest.fn(),
    };

    const useCase = new AssignAccessProfileUseCase(usersRepository as any);

    await expect(useCase.execute({ id: 1, accessProfileId: 9, req: fakeReq })).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    expect(usersRepository.update).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se perfil informado nao existir', async () => {
    mockAccessProfileFindByPk.mockResolvedValue(null);

    const usersRepository = {
      findById: jest.fn(async () => ({ id: 1, email: 'usuario@evokaudio.com', accessProfileId: null })),
      update: jest.fn(),
    };

    const useCase = new AssignAccessProfileUseCase(usersRepository as any);

    await expect(useCase.execute({ id: 1, accessProfileId: 999, req: fakeReq })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('remove atribuicao de perfil quando access_profile_id = null', async () => {
    const usersRepository = {
      findById: jest.fn(async () => ({ id: 1, email: 'usuario@evokaudio.com', accessProfileId: 5 })),
      update: jest.fn(async () => 1),
    };

    const useCase = new AssignAccessProfileUseCase(usersRepository as any);
    const result = await useCase.execute({ id: 1, accessProfileId: null, req: fakeReq });

    expect(result).toEqual({ id: 1, accessProfileId: null });
    expect(usersRepository.update).toHaveBeenCalledWith(1, { accessProfileId: null });
    expect(mockAccessProfileFindByPk).not.toHaveBeenCalled();
  });
});

describe('ListAccessProfilesUseCase', () => {
  it('delega diretamente ao repositorio', async () => {
    const repo = { list: jest.fn(async () => [{ id: 1 }]) };
    const useCase = new ListAccessProfilesUseCase(repo as any);
    const result = await useCase.execute();
    expect(result).toEqual([{ id: 1 }]);
  });
});
