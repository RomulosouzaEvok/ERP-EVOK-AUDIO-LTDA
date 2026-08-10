/**
 * G7 (achado colateral) — a quarentena deixa de ser decorativa para o
 * PLANEJAMENTO.
 *
 * ## O que estava errado (confirmado no codigo em 2026-08-10)
 *
 * O recebimento cria o lote em `quarantine` mas **ja incrementa
 * `products.quantity`** (`services/materialReceiptService.ts` ->
 * `InventoryService.receive`). As duas rotinas de planejamento liam esse
 * numero cru:
 *
 * - MRP (`SequelizeItemRepository.listMrpInventoryPositions`) — planejava
 *   sobre material nao inspecionado e **comprava de menos**;
 * - disponibilidade de OP (`BomService.explodeBOM` -> `checkAvailability`) —
 *   aprovava a OP contra material que o FEFO da producao (que so consome
 *   lote `available`) nunca conseguiria consumir; a falha so aparecia na
 *   conclusao da OP.
 *
 * ## Direcao da correcao (por que ela e segura)
 *
 * O desconto e sempre `max(0, fisico - retido)`. O planejamento passa a ver
 * MENOS estoque, entao o erro possivel e planejar/comprar a mais — nunca
 * consumir material nao liberado. O clamp existe porque ha drift conhecido
 * entre `lot_controls` e `products.quantity` neste banco.
 *
 * @module tests/unit/quarantine-blocks-planning-balance
 */

const lotControlFindAll = jest.fn(async () => [] as any[]);

jest.mock('../../src/models/index', () => ({
  LotControl: { findAll: lotControlFindAll },
}));

const QuarantineBalanceService = require('../../src/services/quarantineBalanceService');
// `Op.in` e uma CHAVE SYMBOL no `where` do Sequelize — `Object.values` nao a
// enxerga. Ler o filtro pelo simbolo real e o que garante que o teste esta
// olhando a query de verdade, e nao um objeto vazio.
const { Op } = require('sequelize');

beforeEach(() => {
  jest.clearAllMocks();
  lotControlFindAll.mockResolvedValue([]);
});

describe('quarantineBalanceService — quais status retem saldo', () => {
  it('retem apenas quarantine e blocked (literais conferidos contra o ENUM de lot_controls.status)', () => {
    expect([...QuarantineBalanceService.WITHHELD_LOT_STATUSES]).toEqual(['quarantine', 'blocked']);
  });

  it('NAO retem reserved (o MRP ja desconta reserva separadamente — descontar aqui seria contar duas vezes)', () => {
    expect([...QuarantineBalanceService.WITHHELD_LOT_STATUSES]).not.toContain('reserved');
  });

  it('NAO retem expired (vencimento e tratado no FEFO; misturar esconderia estoque vencido atras de um numero de qualidade)', () => {
    expect([...QuarantineBalanceService.WITHHELD_LOT_STATUSES]).not.toContain('expired');
  });

  it('NAO retem consumed nem available', () => {
    const statuses = [...QuarantineBalanceService.WITHHELD_LOT_STATUSES];
    expect(statuses).not.toContain('consumed');
    expect(statuses).not.toContain('available');
  });
});

describe('quarantineBalanceService.sumWithheldByProduct', () => {
  it('lista vazia nao toca o banco', async () => {
    const result = await QuarantineBalanceService.sumWithheldByProduct([]);

    expect(result.size).toBe(0);
    expect(lotControlFindAll).not.toHaveBeenCalled();
  });

  it('agrega por produto e consulta somente os status retidos', async () => {
    lotControlFindAll.mockResolvedValue([
      { product_id: 10, withheld_quantity: '40' },
      { product_id: 11, withheld_quantity: '7.5' },
    ]);

    const result = await QuarantineBalanceService.sumWithheldByProduct([10, 11, 12]);

    expect(result.get(10)).toBe(40);
    expect(result.get(11)).toBe(7.5);
    expect(result.has(12)).toBe(false);

    const query = lotControlFindAll.mock.calls[0][0] as any;
    expect([...query.where.status[Op.in]]).toEqual(['quarantine', 'blocked']);
    expect(query.group).toEqual(['product_id']);
  });

  it('deduplica ids e ignora valores nao numericos', async () => {
    await QuarantineBalanceService.sumWithheldByProduct([10, 10, '10', null, undefined, 'abc']);

    const query = lotControlFindAll.mock.calls[0][0] as any;
    expect(query.where.product_id[Op.in]).toEqual([10]);
  });

  it('soma zero/negativa nao entra no mapa (nada a descontar)', async () => {
    lotControlFindAll.mockResolvedValue([
      { product_id: 10, withheld_quantity: '0' },
      { product_id: 11, withheld_quantity: null },
    ]);

    const result = await QuarantineBalanceService.sumWithheldByProduct([10, 11]);

    expect(result.size).toBe(0);
  });
});

describe('quarantineBalanceService.planningQuantity', () => {
  it('desconta o retido do saldo fisico', () => {
    expect(QuarantineBalanceService.planningQuantity('100', 40)).toBe(60);
  });

  it('sem retencao devolve o saldo fisico intacto', () => {
    expect(QuarantineBalanceService.planningQuantity('100', 0)).toBe(100);
  });

  it('nunca devolve negativo, mesmo com drift entre lote e saldo', () => {
    expect(QuarantineBalanceService.planningQuantity(10, 999)).toBe(0);
  });

  it('entrada invalida e tratada como zero em vez de virar NaN no plano do MRP', () => {
    expect(QuarantineBalanceService.planningQuantity(undefined, undefined)).toBe(0);
    expect(QuarantineBalanceService.planningQuantity('abc', 'xyz')).toBe(0);
    expect(QuarantineBalanceService.planningQuantity('50', 'xyz')).toBe(50);
  });
});
