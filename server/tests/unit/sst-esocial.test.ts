/**
 * Testes: fila de eventos eSocial SST (S-2210/S-2220/S-2240) — BLOCO 1.
 *
 * Cobre o reenvio manual de evento `rejeitado` (fluxo principal) e os
 * fluxos de exceção de UC-47: reenviar evento que não está `rejeitado`, e
 * a corrida rara de já existir um evento ativo para a mesma origem
 * (índice único parcial do banco).
 *
 * @group unit
 */

const ResendEsocialEventUseCase = require('../../src/modules/sst/application/use-cases/esocial/ResendEsocialEventUseCase');
const { ValidationError, NotFoundError, ConflictError } = require('../../src/errors');

function makeEsocialRepository(overrides: Partial<any> = {}) {
  return {
    findById: jest.fn(async () => ({ id: 3001, tipo: 'S-2210', origem_tipo: 'cat', origem_id: 77, status: 'rejeitado', prazo_legal: '2026-08-07', payload_referencia: null })),
    findActiveByOrigin: jest.fn(async () => null),
    create: jest.fn(async (data: any) => ({ id: 3002, ...data })),
    ...overrides
  };
}

describe('ResendEsocialEventUseCase', () => {
  it('reenvia um evento rejeitado criando uma NOVA linha pendente (nao sobrescreve o rejeitado)', async () => {
    const repo = makeEsocialRepository();
    const useCase = new ResendEsocialEventUseCase(repo);

    const result = await useCase.execute({ id: 3001 });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'S-2210', origem_tipo: 'cat', origem_id: 77, status: 'pendente' }));
    expect(result.id).toBe(3002);
    expect(result.status).toBe('pendente');
  });

  it('FLUXO DE EXCECAO: rejeita reenviar evento que nao esta "rejeitado" (pendente aguarda o job normal)', async () => {
    const repo = makeEsocialRepository({ findById: jest.fn(async () => ({ id: 3001, status: 'pendente', origem_tipo: 'cat', origem_id: 77 })) });
    const useCase = new ResendEsocialEventUseCase(repo);

    await expect(useCase.execute({ id: 3001 })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: rejeita reenviar evento "aceito" (estado terminal)', async () => {
    const repo = makeEsocialRepository({ findById: jest.fn(async () => ({ id: 3001, status: 'aceito', origem_tipo: 'cat', origem_id: 77 })) });
    const useCase = new ResendEsocialEventUseCase(repo);

    await expect(useCase.execute({ id: 3001 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO (idempotencia, E2/UC-47): rejeita reenvio se ja existir evento ativo para a mesma origem', async () => {
    const repo = makeEsocialRepository({ findActiveByOrigin: jest.fn(async () => ({ id: 3005, status: 'pendente' })) });
    const useCase = new ResendEsocialEventUseCase(repo);

    await expect(useCase.execute({ id: 3001 })).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se o evento nao existir', async () => {
    const repo = makeEsocialRepository({ findById: jest.fn(async () => null) });
    const useCase = new ResendEsocialEventUseCase(repo);

    await expect(useCase.execute({ id: 9999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
