import CreateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase');
import GetNonConformityByIdUseCase = require('../../src/modules/nonConformities/application/use-cases/GetNonConformityByIdUseCase');
import UpdateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase');
import { ValidationError, NotFoundError } from '../../src/errors';

describe('Use cases de não conformidades', () => {
  it('rejeita criação de não conformidade sem descrição', async () => {
    const nonConformitiesRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

    await expect(useCase.execute({ reportedBy: 1 })).rejects.toBeInstanceOf(ValidationError);
    expect(nonConformitiesRepository.create).not.toHaveBeenCalled();
  });

  it('lança NotFoundError ao buscar não conformidade inexistente', async () => {
    const nonConformitiesRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetNonConformityByIdUseCase(nonConformitiesRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  /**
   * ⚠️ Este teste se chamava "define closed_by e closed_at" e **nunca
   * verificou a data** — só `status` e `closed_by`. Foi por isso que o
   * defeito atravessou a suíte: o use case gravava `closed_at`, chave que não
   * é atributo do model, e o Sequelize a descartava em silêncio. O nome
   * anunciava a garantia; a asserção não a cobria.
   *
   * A coluna real é `closed_date` (`DATE`). Ver
   * `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §3.
   */
  it('define closed_by e closed_date (a coluna REAL) ao atualizar status para closed', async () => {
    const nonConformitiesRepository = {
      update: jest.fn(async () => 1),
      findById: jest.fn(async () => ({ id: 1, status: 'closed' })),
    };

    const useCase = new UpdateNonConformityUseCase(nonConformitiesRepository as any);

    await useCase.execute({ id: 1, body: { status: 'closed' }, closedBy: 42 });

    const [, payload] = nonConformitiesRepository.update.mock.calls[0] as any;
    expect(payload).toMatchObject({ status: 'closed', closed_by: 42 });
    expect(payload.closed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload).not.toHaveProperty('closed_at');
  });

  it('lança NotFoundError ao atualizar não conformidade inexistente', async () => {
    const nonConformitiesRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateNonConformityUseCase(nonConformitiesRepository as any);

    await expect(
      useCase.execute({ id: 999, body: { status: 'in_progress' }, closedBy: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
