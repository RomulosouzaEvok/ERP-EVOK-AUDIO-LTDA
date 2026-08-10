/**
 * G1 — controle de alteracao de engenharia da BOM (ISO 9001 §8.5.6).
 *
 * Mesmo com fonte unica, a estrutura ainda podia se contradizer ENTRE
 * REVISOES: `PUT /api/engineering/bom/:id` era um UPDATE cru. Dava para
 * reescrever a revisao de uma BOM ja vigente, ressuscitar uma `superseded` e
 * — o pior — marcar `status: 'active'` numa segunda BOM do mesmo produto.
 * Com duas ativas, `findOne({ product_id, status: 'active' })` devolve uma
 * revisao ARBITRARIA, e planejamento e consumo voltam a discordar.
 *
 * O ciclo travado aqui e o mesmo que o G5 aplicou ao roteiro de manufatura:
 * vigente e imutavel, mudanca gera revisao, a anterior vira `superseded` com
 * os componentes intactos.
 */

const UpdateBOMUseCase = require('../../src/modules/bom/application/use-cases/UpdateBOMUseCase');
const ApproveBOMUseCase = require('../../src/modules/bom/application/use-cases/ApproveBOMUseCase');

/** Repositorio duble com o contrato usado pelos dois use cases. */
function makeRepository(before: Record<string, unknown> | null) {
  return {
    findRawById: jest.fn(async () => before),
    findById: jest.fn(async () => ({ id: 9, product_id: 17, product: { code: 'PA-12POL' } })),
    update: jest.fn(async () => 1),
    activateExclusively: jest.fn(async () => ({ updated: 1, supersededIds: [7] })),
  } as any;
}

describe('G1 - BOM vigente e imutavel no conteudo', () => {
  it('recusa alterar a revisao de uma BOM ativa e manda criar revisao nova', async () => {
    const repository = makeRepository({ id: 9, product_id: 17, status: 'active', revision: 'S1', notes: null });
    const useCase = new UpdateBOMUseCase(repository);

    await expect(useCase.execute({ id: 9, data: { revision: 'S2' } })).rejects.toMatchObject({
      statusCode: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      details: { rule: 'G1-BOM-ATIVA-IMUTAVEL', bomId: 9, fields: ['revision'] },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('recusa alterar notas de engenharia de uma BOM ativa', async () => {
    const repository = makeRepository({ id: 9, product_id: 17, status: 'active', revision: 'S1', notes: 'antiga' });
    const useCase = new UpdateBOMUseCase(repository);

    await expect(useCase.execute({ id: 9, data: { notes: 'nova' } })).rejects.toMatchObject({
      details: { rule: 'G1-BOM-ATIVA-IMUTAVEL', fields: ['notes'] },
    });
  });

  it('nao reclama de um PUT que reenvia os MESMOS valores da BOM vigente', async () => {
    // Reenviar o estado atual nao e alteracao de engenharia — recusar isso
    // quebraria formularios que reenviam o objeto inteiro.
    const repository = makeRepository({ id: 9, product_id: 17, status: 'active', revision: 'S1', notes: 'igual' });
    const useCase = new UpdateBOMUseCase(repository);

    const result = await useCase.execute({ id: 9, data: { revision: 'S1', notes: 'igual' } });

    expect(result.bom).toBeDefined();
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('deixa aposentar (inactive) uma BOM vigente', async () => {
    const repository = makeRepository({ id: 9, product_id: 17, status: 'active', revision: 'S1' });
    const useCase = new UpdateBOMUseCase(repository);

    await useCase.execute({ id: 9, data: { status: 'inactive' } });

    expect(repository.update).toHaveBeenCalledWith(9, { status: 'inactive' });
    expect(repository.activateExclusively).not.toHaveBeenCalled();
  });

  it('recusa devolver uma BOM vigente para rascunho', async () => {
    const repository = makeRepository({ id: 9, product_id: 17, status: 'active', revision: 'S1' });
    const useCase = new UpdateBOMUseCase(repository);

    await expect(useCase.execute({ id: 9, data: { status: 'draft' } })).rejects.toMatchObject({
      details: { rule: 'G1-BOM-STATUS-INVALIDO', from: 'active', to: 'draft' },
    });
  });
});

describe('G1 - BOM substituida e intocavel', () => {
  it('recusa qualquer alteracao numa BOM superseded', async () => {
    const repository = makeRepository({ id: 4, product_id: 17, status: 'superseded', revision: 'S0' });
    const useCase = new UpdateBOMUseCase(repository);

    await expect(useCase.execute({ id: 4, data: { notes: 'ajuste' } })).rejects.toMatchObject({
      details: { rule: 'G1-BOM-SUPERSEDED-IMUTAVEL', bomId: 4, productId: 17 },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('recusa reativar uma BOM superseded pela aprovacao', async () => {
    const repository = makeRepository({ id: 4, product_id: 17, status: 'superseded', revision: 'S0' });
    const useCase = new ApproveBOMUseCase(repository);

    await expect(useCase.execute({ id: 4 })).rejects.toMatchObject({
      details: { rule: 'G1-BOM-SUPERSEDED-IMUTAVEL' },
    });
    expect(repository.activateExclusively).not.toHaveBeenCalled();
  });
});

describe('G1 - ativar uma revisao rebaixa a anterior', () => {
  it('usa a ativacao exclusiva (transacional) em vez de UPDATE solto', async () => {
    const repository = makeRepository({ id: 9, product_id: 17, status: 'draft', revision: 'S2', notes: null });
    const useCase = new UpdateBOMUseCase(repository);

    const result = await useCase.execute({ id: 9, data: { status: 'active', notes: 'liberada' } });

    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.activateExclusively).toHaveBeenCalledWith(9, 17, { notes: 'liberada' });
    expect(result.supersededIds).toEqual([7]);
  });

  it('aprovacao isolada tambem rebaixa a vigente anterior', async () => {
    const repository = makeRepository({ id: 9, product_id: 17, status: 'draft', revision: 'S2' });
    const useCase = new ApproveBOMUseCase(repository);

    const result = await useCase.execute({ id: 9 });

    expect(repository.activateExclusively).toHaveBeenCalledWith(9, 17, {});
    expect(result.supersededIds).toEqual([7]);
  });

  it('404 quando a BOM nao existe', async () => {
    const repository = makeRepository(null);

    await expect(new UpdateBOMUseCase(repository).execute({ id: 9, data: { notes: 'x' } }))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(new ApproveBOMUseCase(repository).execute({ id: 9 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
