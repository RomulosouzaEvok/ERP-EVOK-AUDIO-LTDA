/**
 * Testes: cluster EPI (NR-6) do módulo SST — BLOCO 1.
 *
 * Cobre o fluxo principal (criação em rascunho → confirmação, com e sem
 * `item_id` vinculado) e os fluxos de exceção descritos em
 * `docs/business/BLOCO_1_SST_API.md` §1.3: CA vencido, evidência ausente,
 * reconfirmação (idempotência negativa).
 *
 * @group unit
 */

const CreateEpiDeliveryUseCase = require('../../src/modules/sst/application/use-cases/epi/CreateEpiDeliveryUseCase');
const AttachEpiDeliveryEvidenceUseCase = require('../../src/modules/sst/application/use-cases/epi/AttachEpiDeliveryEvidenceUseCase');
const ConfirmEpiDeliveryUseCase = require('../../src/modules/sst/application/use-cases/epi/ConfirmEpiDeliveryUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      LOCK: { UPDATE: 'UPDATE' }
    }))
  }
}));

function makeTipo(overrides: Partial<any> = {}) {
  return {
    id: 12,
    nome: 'Protetor Auricular Plug',
    ca: '12345',
    ca_validade: '2027-03-01',
    vida_util_dias: 90,
    item_id: null,
    ...overrides
  };
}

function makeEntrega(overrides: Partial<any> = {}) {
  return {
    id: 900,
    employee_id: 501,
    tipo_epi_id: 12,
    quantidade: '1.000000',
    data_entrega: '2026-08-06',
    motivo: 'primeira_entrega',
    confirmada: false,
    evidencia_tipo: null,
    tipoEpi: makeTipo(),
    devolucoes: [],
    ...overrides
  };
}

function makeFakeEpiRepository(overrides: Partial<any> = {}) {
  return {
    findTipoById: jest.fn(async () => makeTipo()),
    findEntregaById: jest.fn(async () => makeEntrega()),
    createEntrega: jest.fn(async (data: any) => ({ id: 900, ...data })),
    updateEntregaRascunho: jest.fn(async (id: any, data: any) => ({ ...makeEntrega(), ...data, id })),
    confirmEntrega: jest.fn(async (id: any, data: any) => ({ ...makeEntrega(), ...data, id })),
    ...overrides
  };
}

describe('CreateEpiDeliveryUseCase', () => {
  it('cria a entrega em rascunho com data_prevista_troca calculada', async () => {
    const repo = makeFakeEpiRepository();
    const useCase = new CreateEpiDeliveryUseCase(repo);

    const result = await useCase.execute({
      body: { employee_id: 501, epi_type_id: 12, quantidade: 1, motivo: 'primeira_entrega', data_entrega: '2026-08-06' },
      entreguePor: 7
    });

    expect(repo.createEntrega).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 501, tipo_epi_id: 12, confirmada: false, entregue_por: 7, data_prevista_troca: '2026-11-04' })
    );
    expect(result.status).toBe('rascunho');
  });

  it('rejeita motivo invalido com ValidationError', async () => {
    const repo = makeFakeEpiRepository();
    const useCase = new CreateEpiDeliveryUseCase(repo);
    await expect(
      useCase.execute({ body: { employee_id: 501, epi_type_id: 12, quantidade: 1, motivo: 'invalido', data_entrega: '2026-08-06' }, entreguePor: 7 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita CA vencido na data de entrega (BR-SST-001) com BusinessRuleError', async () => {
    const repo = makeFakeEpiRepository({ findTipoById: jest.fn(async () => makeTipo({ ca_validade: '2025-01-01' })) });
    const useCase = new CreateEpiDeliveryUseCase(repo);
    await expect(
      useCase.execute({ body: { employee_id: 501, epi_type_id: 12, quantidade: 1, motivo: 'primeira_entrega', data_entrega: '2026-08-06' }, entreguePor: 7 })
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.createEntrega).not.toHaveBeenCalled();
  });

  it('rejeita epi_type_id inexistente com NotFoundError', async () => {
    const repo = makeFakeEpiRepository({ findTipoById: jest.fn(async () => null) });
    const useCase = new CreateEpiDeliveryUseCase(repo);
    await expect(
      useCase.execute({ body: { employee_id: 501, epi_type_id: 999, quantidade: 1, motivo: 'primeira_entrega', data_entrega: '2026-08-06' }, entreguePor: 7 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AttachEpiDeliveryEvidenceUseCase', () => {
  it('anexa evidencia em uma entrega em rascunho', async () => {
    const repo = makeFakeEpiRepository();
    const useCase = new AttachEpiDeliveryEvidenceUseCase(repo);
    await useCase.execute({ id: 900, body: { tipo_evidencia: 'aceite_eletronico', arquivo_url: 'https://x' } });
    expect(repo.updateEntregaRascunho).toHaveBeenCalledWith(900, { evidencia_tipo: 'aceite_eletronico', evidencia_arquivo_url: 'https://x' });
  });

  it('rejeita tipo_evidencia invalido com ValidationError', async () => {
    const repo = makeFakeEpiRepository();
    const useCase = new AttachEpiDeliveryEvidenceUseCase(repo);
    await expect(
      useCase.execute({ id: 900, body: { tipo_evidencia: 'assinatura_eletronica' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita anexar evidencia em entrega ja confirmada (imutavel) com BusinessRuleError', async () => {
    const repo = makeFakeEpiRepository({ findEntregaById: jest.fn(async () => makeEntrega({ confirmada: true })) });
    const useCase = new AttachEpiDeliveryEvidenceUseCase(repo);
    await expect(
      useCase.execute({ id: 900, body: { tipo_evidencia: 'aceite_eletronico' } })
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('ConfirmEpiDeliveryUseCase', () => {
  it('confirma a entrega SEM item_id vinculado (sem movimentacao de estoque)', async () => {
    // findEntregaById(id, t) [dentro da transacao] -> ainda rascunho;
    // findEntregaById(id) [pos-commit, releitura para o DTO] -> confirmada.
    const findEntregaById = jest.fn(async (_id: any, t?: any) =>
      t ? makeEntrega({ evidencia_tipo: 'aceite_eletronico' }) : makeEntrega({ evidencia_tipo: 'aceite_eletronico', confirmada: true, confirmada_em: new Date() })
    );
    const repo = makeFakeEpiRepository({ findEntregaById });
    const inventoryMovementService = { registerOutbound: jest.fn() };
    const useCase = new ConfirmEpiDeliveryUseCase(repo, inventoryMovementService);

    const result = await useCase.execute({ id: 900, confirmedBy: 7 });

    expect(inventoryMovementService.registerOutbound).not.toHaveBeenCalled();
    expect(repo.confirmEntrega).toHaveBeenCalledWith(900, expect.objectContaining({ confirmada: true, inventory_movement_id: null }), expect.anything());
    expect(result.status).toBe('confirmada');
  });

  it('confirma a entrega COM item_id vinculado — dispara saida de estoque na mesma transacao', async () => {
    const tipoComItem = makeTipo({ item_id: 'uuid-item-1' });
    const repo = makeFakeEpiRepository({
      findEntregaById: jest.fn(async () => makeEntrega({ evidencia_tipo: 'aceite_eletronico', tipoEpi: tipoComItem })),
      findTipoById: jest.fn(async () => tipoComItem)
    });
    const inventoryMovementService = { registerOutbound: jest.fn(async () => ({ movement: { id: 55 } })) };
    const useCase = new ConfirmEpiDeliveryUseCase(repo, inventoryMovementService);

    await useCase.execute({ id: 900, confirmedBy: 7 });

    expect(inventoryMovementService.registerOutbound).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: 'uuid-item-1', reference_type: 'sst_epi_delivery', reference_id: 900, userId: 7 })
    );
    expect(repo.confirmEntrega).toHaveBeenCalledWith(900, expect.objectContaining({ inventory_movement_id: 55 }), expect.anything());
  });

  it('FLUXO DE EXCECAO: rejeita reconfirmar uma entrega ja confirmada (idempotencia negativa)', async () => {
    const repo = makeFakeEpiRepository({ findEntregaById: jest.fn(async () => makeEntrega({ confirmada: true })) });
    const inventoryMovementService = { registerOutbound: jest.fn() };
    const useCase = new ConfirmEpiDeliveryUseCase(repo, inventoryMovementService);

    await expect(useCase.execute({ id: 900, confirmedBy: 7 })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.confirmEntrega).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (E1): rejeita confirmar com CA do TipoEPI vencido', async () => {
    const repo = makeFakeEpiRepository({
      findEntregaById: jest.fn(async () => makeEntrega({ evidencia_tipo: 'aceite_eletronico', tipoEpi: makeTipo({ ca_validade: '2020-01-01' }) }))
    });
    const inventoryMovementService = { registerOutbound: jest.fn() };
    const useCase = new ConfirmEpiDeliveryUseCase(repo, inventoryMovementService);

    await expect(useCase.execute({ id: 900, confirmedBy: 7 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.confirmEntrega).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (E2): rejeita confirmar sem evidencia de recebimento', async () => {
    const repo = makeFakeEpiRepository({ findEntregaById: jest.fn(async () => makeEntrega({ evidencia_tipo: null })) });
    const inventoryMovementService = { registerOutbound: jest.fn() };
    const useCase = new ConfirmEpiDeliveryUseCase(repo, inventoryMovementService);

    await expect(useCase.execute({ id: 900, confirmedBy: 7 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.confirmEntrega).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se a entrega nao existir', async () => {
    const repo = makeFakeEpiRepository({ findEntregaById: jest.fn(async () => null) });
    const inventoryMovementService = { registerOutbound: jest.fn() };
    const useCase = new ConfirmEpiDeliveryUseCase(repo, inventoryMovementService);

    await expect(useCase.execute({ id: 999, confirmedBy: 7 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
