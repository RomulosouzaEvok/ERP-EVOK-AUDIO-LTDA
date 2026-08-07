/**
 * Testes: casos de uso de Campanha de Marketing (módulo Marketing).
 *
 * @group unit
 */

const CreateCampaignUseCase = require('../../src/modules/marketing/application/use-cases/campaign/CreateCampaignUseCase');
const UpdateCampaignUseCase = require('../../src/modules/marketing/application/use-cases/campaign/UpdateCampaignUseCase');
const ListCampaignsUseCase = require('../../src/modules/marketing/application/use-cases/campaign/ListCampaignsUseCase');
const GetCampaignByIdUseCase = require('../../src/modules/marketing/application/use-cases/campaign/GetCampaignByIdUseCase');
const { NotFoundError, ValidationError } = require('../../src/errors');

function makeCampaignRepository(overrides: Partial<any> = {}) {
  return {
    findCampaignById: jest.fn(async () => null),
    createCampaign: jest.fn(async (data: any) => ({ id: 1, leads_generated: 0, conversions: 0, ...data })),
    updateCampaign: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listCampaigns: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

describe('CreateCampaignUseCase', () => {
  it('FLUXO PRINCIPAL: cria campanha', async () => {
    const repo = makeCampaignRepository();
    const result = await new CreateCampaignUseCase(repo).execute({
      name: 'Black Friday', campaign_type: 'ads', start_date: '2026-11-01',
    });

    expect(repo.createCampaign).toHaveBeenCalledWith(expect.objectContaining({ name: 'Black Friday' }));
    expect(result.name).toBe('Black Friday');
  });

  it('FLUXO DE EXCECAO: rejeita end_date anterior a start_date', async () => {
    const repo = makeCampaignRepository();

    await expect(
      new CreateCampaignUseCase(repo).execute({
        name: 'Campanha inválida', campaign_type: 'ads', start_date: '2026-11-10', end_date: '2026-11-01',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createCampaign).not.toHaveBeenCalled();
  });
});

describe('UpdateCampaignUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a campanha não existe', async () => {
    const repo = makeCampaignRepository();
    await expect(new UpdateCampaignUseCase(repo).execute({ id: 999, status: 'active' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita end_date anterior ao start_date atual da campanha', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-10', end_date: null })),
    });

    await expect(
      new UpdateCampaignUseCase(repo).execute({ id: 1, end_date: '2026-11-01' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO PRINCIPAL: atualiza status da campanha', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-01', end_date: null })),
    });

    const result = await new UpdateCampaignUseCase(repo).execute({ id: 1, status: 'active' });

    expect(repo.updateCampaign).toHaveBeenCalledWith(1, { status: 'active' });
    expect(result.status).toBe('active');
  });
});

describe('GetCampaignByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a campanha não existe', async () => {
    const repo = makeCampaignRepository();
    await expect(new GetCampaignByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListCampaignsUseCase', () => {
  it('lista campanhas paginadas repassando filtros', async () => {
    const repo = makeCampaignRepository({
      listCampaigns: jest.fn(async () => ({ rows: [{ id: 1, name: 'Black Friday' }], count: 1 })),
    });

    const result = await new ListCampaignsUseCase(repo).execute({ status: 'active', page: 1, limit: 20, offset: 0 });

    expect(repo.listCampaigns).toHaveBeenCalledWith({ status: 'active', campaign_type: undefined }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
