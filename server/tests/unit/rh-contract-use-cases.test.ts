/**
 * Testes dos use cases de Contrato de Experiência (UC-68, RF-RH-013 a 016
 * — P0) e da verificação ativa de vencimento sem decisão (UC-68 E1).
 *
 * Base legal conferida no texto oficial da CLT em 2026-08-09:
 * Art. 445, parágrafo único (90 dias) e Art. 451 (uma única prorrogação;
 * a segunda converte em prazo indeterminado).
 *
 * @module tests/unit/rh-contract-use-cases
 */

import ExtendEmployeeContractUseCase from '../../src/modules/rh/application/use-cases/contract/ExtendEmployeeContractUseCase';
import DecideEmployeeContractUseCase from '../../src/modules/rh/application/use-cases/contract/DecideEmployeeContractUseCase';
import { applyAutoExpireIfNeeded } from '../../src/modules/rh/domain/services/experienceContractAutoExpire';

function buildContract(overrides: Record<string, any> = {}) {
  return {
    id: 42,
    employee_id: 501,
    type: 'experiencia',
    start_date: '2026-08-01',
    period_1_end_date: '2026-09-14', // 44 dias
    period_2_end_date: null,
    status: 'ativo',
    ...overrides,
  };
}

function buildRepository(contract: any = buildContract()) {
  return {
    findById: jest.fn().mockResolvedValue(contract),
    update: jest.fn().mockImplementation(async (id: any, data: any) => ({ ...contract, id, ...data })),
    create: jest.fn().mockImplementation(async (data: any) => ({ id: 43, ...data })),
  } as any;
}

describe('ExtendEmployeeContractUseCase — Art. 445 § único e Art. 451, CLT', () => {
  it('prorroga uma vez dentro do teto de 90 dias', async () => {
    const repository = buildRepository();
    const useCase = new (ExtendEmployeeContractUseCase as any)(repository);

    const result = await useCase.execute({ id: 42, period_2_end_date: '2026-10-30' }); // 90 dias exatos

    expect(result.status).toBe('prorrogado');
    expect(result.effective_end_date).toBe('2026-10-30');
  });

  it('rejeita prorrogação que ultrapassa 90 dias corridos (Art. 445 § único)', async () => {
    const repository = buildRepository();
    const useCase = new (ExtendEmployeeContractUseCase as any)(repository);

    await expect(useCase.execute({ id: 42, period_2_end_date: '2026-10-31' })) // 91 dias
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('EXPERIENCE_CONTRACT_EXCEEDS_90_DAYS') });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejeita a SEGUNDA prorrogação (Art. 451 — silêncio converteria em prazo indeterminado)', async () => {
    const repository = buildRepository(buildContract({ period_2_end_date: '2026-10-01', status: 'ativo' }));
    const useCase = new (ExtendEmployeeContractUseCase as any)(repository);

    await expect(useCase.execute({ id: 42, period_2_end_date: '2026-10-30' }))
      .rejects.toMatchObject({ message: expect.stringContaining('SECOND_EXTENSION_REJECTED') });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejeita prorrogação de contrato que não é de experiência', async () => {
    const repository = buildRepository(buildContract({ type: 'indeterminado' }));
    const useCase = new (ExtendEmployeeContractUseCase as any)(repository);

    await expect(useCase.execute({ id: 42, period_2_end_date: '2026-10-30' }))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('type=experiencia') });
  });

  it('404 quando o contrato não existe', async () => {
    const repository: any = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const useCase = new (ExtendEmployeeContractUseCase as any)(repository);

    await expect(useCase.execute({ id: 999, period_2_end_date: '2026-10-30' })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('DecideEmployeeContractUseCase — RF-RH-016 (UC-68)', () => {
  const runInTransaction = async (fn: any) => fn('TX');

  it('efetivar fecha o contrato de experiência e cria um NOVO indeterminado na mesma transação', async () => {
    const repository = buildRepository();
    const createTermination: any = { execute: jest.fn() };
    const extendUseCase: any = { execute: jest.fn() };
    const useCase = new (DecideEmployeeContractUseCase as any)(repository, createTermination, extendUseCase, runInTransaction);

    const result = await useCase.execute({ id: 42, decision: 'efetivar', createdBy: 9 });

    expect(repository.update).toHaveBeenCalledWith(42, { status: 'efetivado' }, 'TX');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'indeterminado', status: 'ativo', employee_id: 501 }), 'TX');
    expect(result.type).toBe('indeterminado');
    expect(createTermination.execute).not.toHaveBeenCalled();
  });

  it('rescindir abre um TerminationProcess do tipo termino_experiencia, sem encerrar o contrato antes dos gates', async () => {
    const repository = buildRepository();
    const createTermination: any = { execute: jest.fn().mockResolvedValue({ id: 77, termination_type: 'termino_experiencia' }) };
    const extendUseCase: any = { execute: jest.fn() };
    const useCase = new (DecideEmployeeContractUseCase as any)(repository, createTermination, extendUseCase, runInTransaction);

    const result = await useCase.execute({
      id: 42,
      decision: 'rescindir',
      termination_reason: 'Encerramento antecipado solicitado pelo RH',
      notice_modality: 'indenizado',
      createdBy: 9,
    });

    expect(createTermination.execute).toHaveBeenCalledWith(expect.objectContaining({
      employee_id: 501,
      termination_type: 'termino_experiencia',
      termination_reason: 'Encerramento antecipado solicitado pelo RH',
      notice_modality: 'indenizado',
      createdBy: 9,
    }));
    expect(result.id).toBe(77);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each([
    [{ notice_modality: 'trabalhado' }, 'termination_reason'],
    [{ termination_reason: 'Motivo informado' }, 'notice_modality'],
  ])('rescindir rejeita com 400 quando falta %s', async (fields, _missingField) => {
    const repository = buildRepository();
    const createTermination: any = { execute: jest.fn() };
    const useCase = new (DecideEmployeeContractUseCase as any)(
      repository, createTermination, { execute: jest.fn() }, runInTransaction,
    );

    await expect(useCase.execute({ id: 42, decision: 'rescindir', createdBy: 9, ...fields }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(createTermination.execute).not.toHaveBeenCalled();
  });

  it('prorrogar delega para ExtendEmployeeContractUseCase (regra do Art. 451 não é duplicada)', async () => {
    const repository = buildRepository();
    const createTermination: any = { execute: jest.fn() };
    const extendUseCase: any = { execute: jest.fn().mockResolvedValue({ id: 42, status: 'prorrogado' }) };
    const useCase = new (DecideEmployeeContractUseCase as any)(repository, createTermination, extendUseCase, runInTransaction);

    await useCase.execute({ id: 42, decision: 'prorrogar', period_2_end_date: '2026-10-30', createdBy: 9 });

    expect(extendUseCase.execute).toHaveBeenCalledWith({ id: 42, period_2_end_date: '2026-10-30' });
  });

  it('400 quando decision está fora do enum', async () => {
    const repository = buildRepository();
    const useCase = new (DecideEmployeeContractUseCase as any)(repository, { execute: jest.fn() }, { execute: jest.fn() }, runInTransaction);

    await expect(useCase.execute({ id: 42, decision: 'cancelar', createdBy: 9 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('422 quando o contrato já foi efetivado (não está mais em ativo/prorrogado)', async () => {
    const repository = buildRepository(buildContract({ status: 'efetivado' }));
    const useCase = new (DecideEmployeeContractUseCase as any)(repository, { execute: jest.fn() }, { execute: jest.fn() }, runInTransaction);

    await expect(useCase.execute({ id: 42, decision: 'efetivar', createdBy: 9 })).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('experienceContractAutoExpire — UC-68 E1 (vencimento sem decisão vira indeterminado_automatico)', () => {
  it('converte contrato ATIVO com period_1 vencido', async () => {
    const repository = buildRepository();
    const result = await applyAutoExpireIfNeeded(repository, buildContract(), '2026-09-15');

    expect(repository.update).toHaveBeenCalledWith(42, { status: 'indeterminado_automatico' });
    expect(result.status).toBe('indeterminado_automatico');
  });

  it('converte contrato PRORROGADO com period_2 vencido — cenário de maior risco do Art. 451', async () => {
    const contract = buildContract({ status: 'prorrogado', period_2_end_date: '2026-10-30' });
    const repository = buildRepository(contract);

    const result = await applyAutoExpireIfNeeded(repository, contract, '2026-10-31');

    expect(repository.update).toHaveBeenCalledWith(42, { status: 'indeterminado_automatico' });
    expect(result.status).toBe('indeterminado_automatico');
  });

  it('não converte enquanto o período ainda está em curso', async () => {
    const repository = buildRepository();
    await applyAutoExpireIfNeeded(repository, buildContract(), '2026-09-14');

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('não mexe em contrato que não é de experiência', async () => {
    const contract = buildContract({ type: 'indeterminado', period_1_end_date: '2020-01-01' });
    const repository = buildRepository(contract);

    await applyAutoExpireIfNeeded(repository, contract, '2026-09-15');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('não reconverte contrato já efetivado/rescindido', async () => {
    const contract = buildContract({ status: 'efetivado' });
    const repository = buildRepository(contract);

    await applyAutoExpireIfNeeded(repository, contract, '2026-09-15');
    expect(repository.update).not.toHaveBeenCalled();
  });
});
