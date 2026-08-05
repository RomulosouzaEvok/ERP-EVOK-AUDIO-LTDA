/**
 * Test: `SequelizeDashboardRepository.getHandoffsSummary` — contador de
 * handoff de Compras para devoluções pendentes (Bloco B,
 * docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md).
 *
 * @group unit
 * @ticket bloco-b-devolucao-fornecedor
 */

const queryMock = jest.fn();

jest.mock('../../src/models/index', () => ({
  sequelize: { query: queryMock },
}));

import SequelizeDashboardRepository = require('../../src/modules/dashboard/infrastructure/sequelize/SequelizeDashboardRepository');

describe('SequelizeDashboardRepository.getHandoffsSummary — compras.pending_returns', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('inclui compras.pending_returns no resumo, contando RNCs de devolução ainda não encerradas', async () => {
    queryMock
      .mockResolvedValueOnce([{ count: 3 }]) // recebimento
      .mockResolvedValueOnce([{ count: 5 }]) // requisicoes
      .mockResolvedValueOnce([{ count: 2 }]) // expedicao
      .mockResolvedValueOnce([{ count: 1 }]) // quarentena
      .mockResolvedValueOnce([{ count: 4 }]) // open_rncs
      .mockResolvedValueOnce([{ count: 6 }]); // compras.pending_returns

    const repository = new SequelizeDashboardRepository();
    const summary = await repository.getHandoffsSummary();

    expect(summary.compras).toEqual({ pending_returns: 6 });
    // A query de devoluções pendentes exclui RNCs já encerradas
    // (closed/canceled) — Qualidade decidiu, mas Compras ainda não
    // resolveu comercialmente com o fornecedor.
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("immediate_action = :returnAction"),
      expect.objectContaining({
        replacements: { returnAction: 'return_supplier', closedStatuses: ['closed', 'canceled'] },
      })
    );
  });

  it('retorna zero quando não há devoluções pendentes (linha vazia)', async () => {
    queryMock
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]);

    const repository = new SequelizeDashboardRepository();
    const summary = await repository.getHandoffsSummary();

    expect(summary.compras).toEqual({ pending_returns: 0 });
  });
});
