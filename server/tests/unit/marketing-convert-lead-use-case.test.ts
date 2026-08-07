/**
 * Testes: conversão ATÔMICA de lead em cliente (`ConvertLeadUseCase`,
 * RF-MKT-001/002/003, UC-63) — cliente novo/existente/duplicado, transação
 * atômica, e efeito colateral não crítico de recálculo de métricas.
 *
 * @group unit
 */

const ConvertLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/ConvertLeadUseCase');
const { NotFoundError, ValidationError, BusinessRuleError, ConflictError } = require('../../src/errors');

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', campaign_id: null })),
    updateLead: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

function makeClientService(overrides: Partial<any> = {}) {
  return {
    findById: jest.fn(async () => null),
    create: jest.fn(async (data: any) => ({ id: 999, ...data })),
    ...overrides,
  };
}

// Executa o callback diretamente (sem transação real de banco) — suficiente
// para testar a lógica de negócio isoladamente do Sequelize.
const fakeRunInTransaction = async (fn: (t: unknown) => Promise<any>) => fn({ fake: true });

describe('ConvertLeadUseCase (RF-MKT-001/002/003, UC-63)', () => {
  it('FLUXO PRINCIPAL (opção A — cliente existente): converte o lead vinculando o cliente informado', async () => {
    const leadRepo = makeLeadRepository();
    const clientService = makeClientService({
      findById: jest.fn(async () => ({ id: 4821, name: 'João Pereira' })),
    });

    const result = await new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({
      id: 1, client_id: 4821,
    });

    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, expect.objectContaining({
      status: 'converted', converted_to_customer_id: 4821, converted_at: expect.any(Date),
    }), { fake: true });
    expect(result.client.id).toBe(4821);
    expect(result.lead.status).toBe('converted');
  });

  it('FLUXO ALTERNATIVO A1 (opção B — cliente novo): cria o cliente e converte na mesma transação', async () => {
    const leadRepo = makeLeadRepository();
    const clientService = makeClientService();

    const result = await new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({
      id: 1, new_client: { name: 'João Pereira', cpf_cnpj: '12345678900' },
    });

    expect(clientService.create).toHaveBeenCalledWith({ name: 'João Pereira', cpf_cnpj: '12345678900' }, { fake: true });
    expect(result.client.id).toBe(999);
    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, expect.objectContaining({ converted_to_customer_id: 999 }), { fake: true });
  });

  it('FLUXO DE EXCECAO E1 (CPF/CNPJ duplicado): reverte tudo — lead não é atualizado, erro original propaga', async () => {
    const leadRepo = makeLeadRepository();
    const clientService = makeClientService({
      create: jest.fn(async () => { throw new ConflictError('CPF/CNPJ já cadastrado'); }),
    });

    await expect(
      new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({
        id: 1, new_client: { name: 'João', cpf_cnpj: '12345678900' },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(leadRepo.updateLead).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO E2 (transição inválida): lead não está em qualified/in_sales_attendance', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'new', campaign_id: null })),
    });
    const clientService = makeClientService();

    await expect(
      new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({ id: 1, client_id: 5 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(clientService.findById).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO E2: lead já converted não pode ser convertido de novo', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'converted', campaign_id: null })),
    });
    const clientService = makeClientService();

    await expect(
      new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({ id: 1, client_id: 5 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO E3: rejeita payload sem client_id nem new_client', async () => {
    const leadRepo = makeLeadRepository();
    const clientService = makeClientService();

    await expect(
      new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({ id: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO E3: rejeita payload com client_id E new_client ao mesmo tempo', async () => {
    const leadRepo = makeLeadRepository();
    const clientService = makeClientService();

    await expect(
      new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({
        id: 1, client_id: 5, new_client: { name: 'X', cpf_cnpj: '123' },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: client_id inexistente retorna NotFoundError, sem escrever nada', async () => {
    const leadRepo = makeLeadRepository();
    const clientService = makeClientService({ findById: jest.fn(async () => null) });

    await expect(
      new ConvertLeadUseCase(leadRepo, clientService, undefined, fakeRunInTransaction).execute({ id: 1, client_id: 999999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leadRepo.updateLead).not.toHaveBeenCalled();
  });

  it('FLUXO PRINCIPAL: dispara recálculo de métricas da campanha quando o lead tem campaign_id (efeito colateral não crítico)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', campaign_id: 10 })),
    });
    const clientService = makeClientService({ findById: jest.fn(async () => ({ id: 4821 })) });
    const recalculateUseCase = { execute: jest.fn(async () => ({ id: 10 })) };

    await new ConvertLeadUseCase(leadRepo, clientService, recalculateUseCase as any, fakeRunInTransaction).execute({ id: 1, client_id: 4821 });

    expect(recalculateUseCase.execute).toHaveBeenCalledWith({ id: 10 });
  });

  it('FLUXO PRINCIPAL: falha no recálculo de métricas NÃO derruba a resposta de conversão (efeito colateral não crítico)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', campaign_id: 10 })),
    });
    const clientService = makeClientService({ findById: jest.fn(async () => ({ id: 4821 })) });
    const recalculateUseCase = { execute: jest.fn(async () => { throw new Error('falha simulada'); }) };

    const result = await new ConvertLeadUseCase(leadRepo, clientService, recalculateUseCase as any, fakeRunInTransaction).execute({ id: 1, client_id: 4821 });

    expect(result.client.id).toBe(4821);
  });
});
