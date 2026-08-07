/**
 * Testes: efeitos de aplicação do saneamento de leads `converted` órfãos
 * (migration `20260807-000312`, `docs/business/BLOCO_5_MKT_MODELO_DADOS.md`
 * §3.2) — o saneamento em si é feito em SQL dentro da migration (fora do
 * escopo de teste unitário), mas a camada de aplicação precisa: (1) filtrar
 * leads sinalizados (`needs_review`/`data_issue_flag`) em
 * `GET /leads?data_issue_flag=true` (`ListLeadsUseCase`), e (2) permitir que
 * um lead rebaixado para `qualified` volte a `in_sales_attendance`/seja
 * reconvertido normalmente pelo fluxo padrão (UC-63), sem tratamento
 * especial — `needs_review=true` é só um sinalizador de triagem, nunca um
 * bloqueio de fluxo.
 *
 * @group unit
 */

const ListLeadsUseCase = require('../../src/modules/marketing/application/use-cases/lead/ListLeadsUseCase');
const ChangeLeadStatusUseCase = require('../../src/modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase');
const ConvertLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/ConvertLeadUseCase');

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    listLeads: jest.fn(async () => ({ rows: [], count: 0 })),
    findLeadById: jest.fn(async () => null),
    updateLead: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

function makeCampaignRepository() {
  return { findCampaignById: jest.fn(async () => null), updateCampaign: jest.fn() };
}

function makeClientService(overrides: Partial<any> = {}) {
  return { findById: jest.fn(async () => ({ id: 4821 })), create: jest.fn(), ...overrides };
}

const fakeRunInTransaction = async (fn: (t: unknown) => Promise<any>) => fn({ fake: true });

describe('Saneamento de leads converted órfãos — efeitos de aplicação (needs_review)', () => {
  it('GET /leads?data_issue_flag=true repassa o filtro needs_review ao repositório', async () => {
    const leadRepo = makeLeadRepository({
      listLeads: jest.fn(async () => ({
        rows: [{ id: 501, status: 'qualified', needs_review: true }],
        count: 1,
      })),
    });

    const result = await new ListLeadsUseCase(leadRepo).execute({ data_issue_flag: true, page: 1, limit: 20, offset: 0 });

    expect(leadRepo.listLeads).toHaveBeenCalledWith(
      expect.objectContaining({ data_issue_flag: true }),
      { limit: 20, offset: 0 },
    );
    expect(result.rows[0].needs_review).toBe(true);
  });

  it('lead rebaixado (needs_review=true, status=qualified) segue o fluxo normal de handoff/qualificação, sem tratamento especial', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 501, status: 'qualified', needs_review: true, sales_owner_user_id: 34 })),
    });
    const campaignRepo = makeCampaignRepository();

    const result = await new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 501, status: 'in_sales_attendance' });

    expect(result.status).toBe('in_sales_attendance');
  });

  it('lead rebaixado pode ser reconvertido normalmente via UC-63 (needs_review não bloqueia a conversão)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 501, status: 'in_sales_attendance', needs_review: true, campaign_id: null })),
    });
    const clientService = makeClientService();

    const result = await new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({
      id: 501, client_id: 4821,
    });

    expect(result.lead.status).toBe('converted');
    expect(result.lead.converted_to_customer_id).toBe(4821);
  });
});
