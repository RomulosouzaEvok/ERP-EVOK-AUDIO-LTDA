/**
 * Teste: `SequelizeCostCenterRepository.getCostCenterTotalsByPayable`/
 * `getCostCenterTotalsByReceivable` devem filtrar "realizado" pela data
 * REAL de pagamento (`payment_date`), não pelo vencimento (`due_date`) —
 * correção do achado P1-1 da auditoria
 * `docs/governance/auditorias/AUDITORIA_CONT_TES_CTR_2026-08-07.md`.
 *
 * @group unit
 */

jest.mock('../../src/models/index', () => ({
  CostCenter: { findAndCountAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../src/config/database', () => ({
  sequelize: { query: jest.fn(async () => []) },
}));

const { sequelize } = require('../../src/config/database');
const SequelizeCostCenterRepository = require('../../src/modules/financial/infrastructure/sequelize/SequelizeCostCenterRepository');

describe('SequelizeCostCenterRepository — semântica de "realizado" por data de pagamento (P1-1)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getCostCenterTotalsByPayable filtra realized_amount por payment_date (com fallback due_date), não apenas por due_date', async () => {
    const repo = new SequelizeCostCenterRepository();

    await repo.getCostCenterTotalsByPayable('2026-08-01', '2026-08-31');

    expect(sequelize.query).toHaveBeenCalledTimes(1);
    const [sql, options] = sequelize.query.mock.calls[0];

    // A query não pode mais somar amount_paid indiscriminadamente contra
    // due_date — precisa referenciar payment_date com fallback COALESCE.
    expect(sql).toMatch(/COALESCE\(ap\.payment_date,\s*ap\.due_date\)/);
    expect(sql).toContain('ap.amount_paid');
    expect(options.replacements).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('getCostCenterTotalsByReceivable filtra realized_amount por payment_date (com fallback due_date), simetria com payable', async () => {
    const repo = new SequelizeCostCenterRepository();

    await repo.getCostCenterTotalsByReceivable('2026-08-01', '2026-08-31');

    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/COALESCE\(ar\.payment_date,\s*ar\.due_date\)/);
  });

  it('a cláusula WHERE inclui devido (due_date) OU pago (payment_date) no período — não perde conta paga fora do mês de vencimento', async () => {
    const repo = new SequelizeCostCenterRepository();

    await repo.getCostCenterTotalsByPayable('2026-09-01', '2026-09-30');

    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/ap\.due_date BETWEEN :from AND :to OR COALESCE\(ap\.payment_date, ap\.due_date\) BETWEEN :from AND :to/);
  });
});
