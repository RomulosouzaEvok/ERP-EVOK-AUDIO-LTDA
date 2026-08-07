/**
 * Testes: cluster Procuração (`JurProxy`, UC-55) e Propriedade Intelectual
 * (`JurIntellectualProperty`, RF-JUR-031 a 034) do módulo Jurídico
 * (`docs/business/BLOCO_3_JUR_API.md` §5-6, passada 2/2).
 *
 * Foco: `communication_record` obrigatório na revogação (RF-JUR-028),
 * expiração automática ao acessar (E2/RF-JUR-029), `trade_secret` nunca
 * aceita `attachment_url` (RF-JUR-033) e a regra de acesso mais restritiva
 * do módulo — `role==='admin'` exclusivo para `trade_secret` (§6.3).
 *
 * @group unit
 */

const CreateProxyUseCase = require('../../src/modules/juridico/application/use-cases/proxy/CreateProxyUseCase');
const RevokeProxyUseCase = require('../../src/modules/juridico/application/use-cases/proxy/RevokeProxyUseCase');
const GetProxyByIdUseCase = require('../../src/modules/juridico/application/use-cases/proxy/GetProxyByIdUseCase');
const ListProxiesUseCase = require('../../src/modules/juridico/application/use-cases/proxy/ListProxiesUseCase');

const CreateIpAssetUseCase = require('../../src/modules/juridico/application/use-cases/ipAsset/CreateIpAssetUseCase');
const GetIpAssetByIdUseCase = require('../../src/modules/juridico/application/use-cases/ipAsset/GetIpAssetByIdUseCase');
const ListIpAssetsUseCase = require('../../src/modules/juridico/application/use-cases/ipAsset/ListIpAssetsUseCase');
const LinkIpContractUseCase = require('../../src/modules/juridico/application/use-cases/ipAsset/LinkIpContractUseCase');

const { ValidationError, NotFoundError, BusinessRuleError, ForbiddenError } = require('../../src/errors');

function makeProxy(overrides: Partial<any> = {}) {
  return { id: 700, status: 'active', expiration_date: null, ...overrides };
}

function makeProxyRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialProxy ?? makeProxy();
  return {
    create: jest.fn(async (data: any) => { state = { ...state, id: 700, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    findAndCount: jest.fn(async () => ({ count: 1, rows: [state] })),
    ...overrides,
  };
}

function makeAlertRepository() {
  return { create: jest.fn(async (data: any) => ({ id: 1, ...data })) };
}

describe('CreateProxyUseCase', () => {
  it('cadastra procuracao e cria alerta de vencimento quando expiration_date definida (fluxo principal)', async () => {
    const repo = makeProxyRepository();
    const alertRepo = makeAlertRepository();

    const result = await new CreateProxyUseCase(repo, alertRepo).execute({
      grantee_name: 'Dr. Carlos Mendes', powers_text: 'Poderes ad judicia', form: 'private',
      issue_date: '2026-08-07', expiration_date: '2027-08-07', createdBy: 1,
    });

    expect(result.status).toBe('active');
    expect(alertRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origin_type: 'proxy', origin_id: 700 }));
  });

  it('nao cria alerta quando expiration_date e null (vigencia indeterminada, A1)', async () => {
    const repo = makeProxyRepository();
    const alertRepo = makeAlertRepository();

    await new CreateProxyUseCase(repo, alertRepo).execute({
      grantee_name: 'Dr. Carlos Mendes', powers_text: 'Poderes ad judicia', form: 'private', issue_date: '2026-08-07', createdBy: 1,
    });

    expect(alertRepo.create).not.toHaveBeenCalled();
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeProxyRepository();
    const alertRepo = makeAlertRepository();
    await expect(
      new CreateProxyUseCase(repo, alertRepo).execute({ createdBy: 1 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('RevokeProxyUseCase', () => {
  it('revoga com communication_record (fluxo principal, RF-JUR-028)', async () => {
    const repo = makeProxyRepository();
    const result = await new RevokeProxyUseCase(repo).execute({
      id: 700, communication_record: 'E-mail enviado ao outorgado e protocolo em cartório nº 4455',
    });
    expect(result.status).toBe('revoked');
  });

  it('rejeita sem communication_record (400, RF-JUR-028)', async () => {
    const repo = makeProxyRepository();
    await expect(
      new RevokeProxyUseCase(repo).execute({ id: 700 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('lanca NotFoundError se a procuracao nao existir', async () => {
    const repo = makeProxyRepository({ findById: jest.fn(async () => null) });
    await expect(
      new RevokeProxyUseCase(repo).execute({ id: 999, communication_record: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GetProxyByIdUseCase — expiracao automatica (E2/RF-JUR-029)', () => {
  it('marca expired ao acessar procuracao active com expiration_date no passado', async () => {
    const repo = makeProxyRepository({ initialProxy: makeProxy({ status: 'active', expiration_date: '2020-01-01' }) });
    const result = await new GetProxyByIdUseCase(repo).execute({ id: 700 });
    expect(result.status).toBe('expired');
  });

  it('mantem active quando expiration_date no futuro', async () => {
    const repo = makeProxyRepository({ initialProxy: makeProxy({ status: 'active', expiration_date: '2099-01-01' }) });
    const result = await new GetProxyByIdUseCase(repo).execute({ id: 700 });
    expect(result.status).toBe('active');
  });

  it('lanca NotFoundError se a procuracao nao existir', async () => {
    const repo = makeProxyRepository({ findById: jest.fn(async () => null) });
    await expect(new GetProxyByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListProxiesUseCase', () => {
  it('lista procuracoes com paginacao', async () => {
    const repo = makeProxyRepository();
    const result = await new ListProxiesUseCase(repo).execute({ filters: {}, page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
  });
});

// ---- Propriedade Intelectual ----

function makeIpAsset(overrides: Partial<any> = {}) {
  return { id: 500, ip_type: 'trademark', status: 'filed', ...overrides };
}

function makeIpAssetRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialAsset ?? makeIpAsset();
  return {
    create: jest.fn(async (data: any) => { state = { ...state, id: 500, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    findAndCount: jest.fn(async () => ({ count: 1, rows: [state] })),
    linkContract: jest.fn(async (data: any) => ({ id: 1, ...data })),
    listContractLinks: jest.fn(async () => []),
    ...overrides,
  };
}

describe('CreateIpAssetUseCase', () => {
  it('cadastra ativo de PI e cria alerta de renovacao para trademark (RF-JUR-032)', async () => {
    const repo = makeIpAssetRepository();
    const alertRepo = makeAlertRepository();

    const result = await new CreateIpAssetUseCase(repo, alertRepo).execute({
      type: 'trademark', description: 'Marca EVOK ÁUDIO', expiration_date: '2028-01-15', responsible_user_id: 12,
    });

    expect(result.ip_type).toBe('trademark');
    expect(alertRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origin_type: 'intellectual_property', alert_subtype: 'renewal' }));
  });

  it('rejeita trade_secret com attachment_url (422, RF-JUR-033)', async () => {
    const repo = makeIpAssetRepository();
    const alertRepo = makeAlertRepository();
    await expect(
      new CreateIpAssetUseCase(repo, alertRepo).execute({
        type: 'trade_secret', description: 'Fórmula X (metadados apenas)', responsible_user_id: 12, attachment_url: 'https://x/segredo.pdf',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('aceita trade_secret sem attachment_url (fluxo principal)', async () => {
    const repo = makeIpAssetRepository();
    const alertRepo = makeAlertRepository();
    const result = await new CreateIpAssetUseCase(repo, alertRepo).execute({
      type: 'trade_secret', description: 'Fórmula X (metadados apenas)', holding_area: 'Engenharia', responsible_user_id: 12,
    });
    expect(result.ip_type).toBe('trade_secret');
  });

  it('rejeita type invalido', async () => {
    const repo = makeIpAssetRepository();
    const alertRepo = makeAlertRepository();
    await expect(
      new CreateIpAssetUseCase(repo, alertRepo).execute({ type: 'invalid', responsible_user_id: 12 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('GetIpAssetByIdUseCase — regra de acesso trade_secret (§6.3, RF-JUR-033)', () => {
  it('permite admin acessar trade_secret', async () => {
    const repo = makeIpAssetRepository({ initialAsset: makeIpAsset({ ip_type: 'trade_secret' }) });
    const result = await new GetIpAssetByIdUseCase(repo).execute({ id: 500, isAdmin: true });
    expect(result.ip_type).toBe('trade_secret');
  });

  it('bloqueia nao-admin de acessar trade_secret (403, mesmo com juridico:approve)', async () => {
    const repo = makeIpAssetRepository({ initialAsset: makeIpAsset({ ip_type: 'trade_secret' }) });
    await expect(
      new GetIpAssetByIdUseCase(repo).execute({ id: 500, isAdmin: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('permite qualquer usuario acessar ativo que nao e trade_secret', async () => {
    const repo = makeIpAssetRepository({ initialAsset: makeIpAsset({ ip_type: 'trademark' }) });
    const result = await new GetIpAssetByIdUseCase(repo).execute({ id: 500, isAdmin: false });
    expect(result.ip_type).toBe('trademark');
  });
});

describe('ListIpAssetsUseCase', () => {
  it('propaga excludeTradeSecret=true para nao-admin', async () => {
    const repo = makeIpAssetRepository();
    await new ListIpAssetsUseCase(repo).execute({ filters: {}, page: 1, limit: 20, isAdmin: false });
    expect(repo.findAndCount).toHaveBeenCalledWith(expect.anything(), expect.anything(), true);
  });

  it('propaga excludeTradeSecret=false para admin', async () => {
    const repo = makeIpAssetRepository();
    await new ListIpAssetsUseCase(repo).execute({ filters: {}, page: 1, limit: 20, isAdmin: true });
    expect(repo.findAndCount).toHaveBeenCalledWith(expect.anything(), expect.anything(), false);
  });
});

describe('LinkIpContractUseCase', () => {
  it('rejeita sem contract_id', async () => {
    const repo = makeIpAssetRepository();
    await expect(
      new LinkIpContractUseCase(repo).execute({ ipId: 500 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('lanca NotFoundError se o ativo de PI nao existir', async () => {
    const repo = makeIpAssetRepository({ findById: jest.fn(async () => null) });
    await expect(
      new LinkIpContractUseCase(repo).execute({ ipId: 999, contract_id: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanca NotFoundError se o contrato nao existir (fluxo principal exige mock de JurContract)', async () => {
    const repo = makeIpAssetRepository();
    const { JurContract } = require('../../src/models/index');
    jest.spyOn(JurContract, 'findByPk').mockResolvedValueOnce(null);
    await expect(
      new LinkIpContractUseCase(repo).execute({ ipId: 500, contract_id: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('vincula contrato existente (fluxo principal)', async () => {
    const repo = makeIpAssetRepository();
    const { JurContract } = require('../../src/models/index');
    jest.spyOn(JurContract, 'findByPk').mockResolvedValueOnce({ id: 900 });
    const result = await new LinkIpContractUseCase(repo).execute({ ipId: 500, contract_id: 900 });
    expect(result.contract_id).toBe(900);
  });
});
