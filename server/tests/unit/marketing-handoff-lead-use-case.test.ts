/**
 * Testes: handoff (atribuição/reatribuição) de responsável de Vendas a um
 * lead (`HandoffLeadUseCase`, RF-MKT-011/012/013/015, UC-64) — RBAC dupla é
 * testada na camada de rota (`server/src/middlewares/authorizeAnyModule.ts`,
 * já coberto por `authorizeAnyModule`), aqui cobrimos a regra de negócio.
 *
 * @group unit
 */

const HandoffLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/HandoffLeadUseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../src/errors');

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', sales_owner_user_id: null })),
    updateLead: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

function makeUserLookupService(overrides: Partial<any> = {}) {
  return {
    findActiveById: jest.fn(async (id: number) => ({ id, active: true })),
    ...overrides,
  };
}

describe('HandoffLeadUseCase (RF-MKT-011/012/013/015, UC-64)', () => {
  it('FLUXO PRINCIPAL: atribui sales_owner_user_id e grava handoff_at para lead qualified', async () => {
    const leadRepo = makeLeadRepository();
    const userLookup = makeUserLookupService();

    const result = await new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 1, sales_owner_user_id: 34 });

    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, expect.objectContaining({ sales_owner_user_id: 34, handoff_at: expect.any(Date) }));
    expect(result.sales_owner_user_id).toBe(34);
  });

  it('FLUXO ALTERNATIVO: reatribuição permitida em in_sales_attendance (troca de vendedor)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'in_sales_attendance', sales_owner_user_id: 34 })),
    });
    const userLookup = makeUserLookupService();

    const result = await new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 1, sales_owner_user_id: 55 });

    expect(result.sales_owner_user_id).toBe(55);
  });

  it('FLUXO DE EXCECAO: rejeita sales_owner_user_id ausente', async () => {
    const leadRepo = makeLeadRepository();
    const userLookup = makeUserLookupService();

    await expect(
      new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 1, sales_owner_user_id: undefined as any }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO E2: lead não encontrado', async () => {
    const leadRepo = makeLeadRepository({ findLeadById: jest.fn(async () => null) });
    const userLookup = makeUserLookupService();

    await expect(
      new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 999, sales_owner_user_id: 34 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO E2: usuário de vendas inexistente/inativo', async () => {
    const leadRepo = makeLeadRepository();
    const userLookup = makeUserLookupService({ findActiveById: jest.fn(async () => null) });

    await expect(
      new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 1, sales_owner_user_id: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leadRepo.updateLead).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: bloqueia handoff para lead em new/contacted (ainda não qualificado)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'contacted', sales_owner_user_id: null })),
    });
    const userLookup = makeUserLookupService();

    await expect(
      new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 1, sales_owner_user_id: 34 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: bloqueia handoff para lead terminal (converted/lost)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'converted', sales_owner_user_id: 34 })),
    });
    const userLookup = makeUserLookupService();

    await expect(
      new HandoffLeadUseCase(leadRepo, userLookup as any).execute({ id: 1, sales_owner_user_id: 55 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});
