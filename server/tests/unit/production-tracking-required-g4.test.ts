/**
 * Test: Apontamento de producao OBRIGATORIO para concluir a OP (gap G4).
 *
 * Base legal (nao e preferencia de processo): Ajuste SINIEF 2/09, clausula 3a
 * §7o III — Bloco K desde 01/01/2019 para os demais estabelecimentos
 * industriais das divisoes 10 a 32 (alto-falante = CNAE 2640-0/00, divisao
 * 26); §10 (so a escrituracao completa desobriga o Livro modelo 3, que exige
 * consumo e producao POR ORDEM DE PRODUCAO); §13 (a versao simplificada
 * dispensa transmitir, nao dispensa registrar). Ver
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisao 4.
 *
 * Cobre:
 * - as 6 regras de bloqueio, cada uma afirmando `details.rule`;
 * - a prova de que uma conclusao reprovada **nao grava nada** (nem estoque,
 *   nem lote, nem custo, nem o proprio status da OP) e faz rollback;
 * - o caminho feliz completo, liberacao -> apontamento -> conclusao, com custo
 *   de mao-de-obra REAL (> 0) chegando ao ledger;
 * - a materializacao das etapas do roteiro ativo na liberacao, que e o que
 *   torna a regra exequivel (e o que amarra o apontamento a revisao executada);
 * - a janela de transicao `PRODUCTION_TRACKING_REQUIRED=warn`.
 *
 * @group unit
 * @ticket G4
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      id: 'tx-g4',
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../../src/services/bomService', () => ({
  checkAvailability: jest.fn(async () => ({ available: true, max_possible_quantity: 100, missing_items: [] })),
  explodeBOM: jest.fn(),
}));

// O mock precisa expor TODA a superficie de `inventoryService` que o caso de
// uso chama: uma funcao faltando vira "X is not a function", que `completeOrder`
// embrulha em ConflictError — e o teste passaria/falharia pelo motivo errado.
jest.mock('../../src/services/inventoryService', () => ({
  reserve: jest.fn(async () => ({})),
  consume: jest.fn(async () => ({})),
  receive: jest.fn(async () => ({ product: { id: 1, name: 'Alto-falante 12pol', quantity: 10 } })),
  releaseReservation: jest.fn(async () => ({})),
  releaseAllReservationsForOrder: jest.fn(async () => []),
  listOrderReservations: jest.fn(async () => []),
  recalculateReservedCache: jest.fn(async () => 0),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

jest.mock('../../src/services/costingService', () => ({
  registerWeightedAverageCost: jest.fn(async () => ({ ledger: { id: 1 }, previousCost: 0, newCost: 10, totalCost: 100 })),
  registerAdditionalProductionCost: jest.fn(async () => ({ ledger: { id: 2 }, previousCost: 10, newCost: 12, totalCost: 20 })),
}));

jest.mock('../../src/models/index', () => ({
  LotControl: {
    create: jest.fn(async () => ({ id: 1, lot_number: 'LOT-FG-001', status: 'available', quantity_available: 10 })),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  ProductionLotConsumption: { create: jest.fn(async () => ({ id: 1 })) },
  SerialNumber: { create: jest.fn(async () => ({ id: 1 })) },
  ProductionCostSettings: {
    findByPk: jest.fn(async () => ({
      overhead_calculation_basis: 'material_labor',
      overhead_rate_percent: 0,
      default_labor_rate_per_hour: 0,
      get: function () { return this; },
    })),
  },
}));

import ChangeProductionOrderStatusUseCase = require('../../src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase');
import { BusinessRuleError } from '../../src/errors';
import {
  PRODUCTION_TRACKING_RULES,
  computeStepHours,
  resolveStepLaborRate,
  resolveTrackingEnforcementMode,
} from '../../src/modules/production/domain/productionTrackingRules';

const BomService = require('../../src/services/bomService');
const InventoryService = require('../../src/services/inventoryService');
const CostingService = require('../../src/services/costingService');
const WarehouseStockService = require('../../src/services/warehouseStockService');
const { sequelize } = require('../../src/config/database');
const { LotControl, ProductionLotConsumption, ProductionCostSettings } = require('../../src/models/index');

/**
 * ENUM real de `production_order_tracking.status`, conferido contra `pg_enum`
 * no banco de dev em 2026-08-10.
 *
 * Literal de ENUM inexistente passa por typecheck E por teste unitario com
 * repositorio dublê, e so explode como 500 do Postgres — classe de defeito ja
 * encontrada 4 vezes neste projeto
 * (`docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §2). Esta
 * constante existe para que a materializacao seja conferida contra a lista
 * real, nao contra a memoria de quem escreveu o teste.
 */
const TRACKING_STATUS_ENUM = ['pending', 'in_progress', 'paused', 'completed', 'skipped'];

/** Recupera a transacao criada pela ultima chamada ao caso de uso. */
async function lastTransaction(): Promise<any> {
  const results = (sequelize.transaction as jest.Mock).mock.results;
  return results[results.length - 1].value;
}

/**
 * Afirma que NADA foi gravado: nem estoque, nem deposito, nem lote, nem custo,
 * nem o status da OP — e que a transacao foi revertida.
 *
 * @param repo - Repositorio dublê usado no cenario.
 */
async function expectNothingWasWritten(repo: any): Promise<void> {
  expect(InventoryService.consume).not.toHaveBeenCalled();
  expect(InventoryService.receive).not.toHaveBeenCalled();
  expect(InventoryService.releaseAllReservationsForOrder).not.toHaveBeenCalled();
  expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
  expect(LotControl.create).not.toHaveBeenCalled();
  expect(ProductionLotConsumption.create).not.toHaveBeenCalled();
  expect(CostingService.registerWeightedAverageCost).not.toHaveBeenCalled();
  expect(CostingService.registerAdditionalProductionCost).not.toHaveBeenCalled();
  expect(repo.update).not.toHaveBeenCalled();

  const transaction = await lastTransaction();
  expect(transaction.rollback).toHaveBeenCalled();
  expect(transaction.commit).not.toHaveBeenCalled();
}

/** Etapa de apontamento completa e integralmente valida. */
function completedStep(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    sequence: 1,
    status: 'completed',
    quantity_good: 10,
    started_at: new Date('2026-08-19T08:00:00Z'),
    finished_at: new Date('2026-08-19T10:00:00Z'), // 2h
    routeStep: { id: 100, work_center_id: 5, workCenter: { id: 5, cost_per_hour: 50 } },
    ...overrides,
  };
}

/** Repositorio dublê da OP com o conjunto de apontamentos informado. */
function makeRepo(trackings: any[], overrides: Record<string, any> = {}) {
  return {
    listTrackingByOrderForUpdate: jest.fn(async () => trackings),
    listTrackingWithRouteStepByOrder: jest.fn(async () => trackings),
    findActiveRouteWithStepsByProduct: jest.fn(async () => null),
    bulkCreateTracking: jest.fn(async (rows: any[]) => rows),
    findByIdForUpdate: jest.fn(async () => ({
      id: 7,
      status: 'in_progress',
      order_number: 'OP-2026-0007',
      product_id: 1,
      quantity: 10,
      due_date: new Date('2026-08-31'),
      get: function () { return this; },
    })),
    update: jest.fn(),
    findByIdWithProductSummary: jest.fn(async () => ({ id: 7, status: 'completed' })),
    findProductById: jest.fn(async () => ({ id: 1, reserved_quantity: 0 })),
    ...overrides,
  };
}

/** Executa a conclusao e devolve o erro lancado (ou `undefined`). */
async function completeAndCatch(repo: any, input: Record<string, any> = {}): Promise<any> {
  const useCase = new ChangeProductionOrderStatusUseCase(repo);
  return useCase
    .execute({ id: 7, status: 'completed', quantity_produced: 10, user_id: 3, ...input })
    .then(() => undefined)
    .catch((error: any) => error);
}

describe('G4 — apontamento de producao obrigatorio', () => {
  const previousMode = process.env.PRODUCTION_TRACKING_REQUIRED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PRODUCTION_TRACKING_REQUIRED; // ausente = modo padrao `block`
    BomService.explodeBOM.mockResolvedValue({ components: [], total_cost: 200 });
    BomService.checkAvailability.mockResolvedValue({ available: true, max_possible_quantity: 100, missing_items: [] });
  });

  afterAll(() => {
    if (previousMode === undefined) delete process.env.PRODUCTION_TRACKING_REQUIRED;
    else process.env.PRODUCTION_TRACKING_REQUIRED = previousMode;
  });

  describe('modo de vigencia (PRODUCTION_TRACKING_REQUIRED)', () => {
    it('sem a variavel definida, o modo e `block` — a lei vale por padrao', () => {
      expect(resolveTrackingEnforcementMode(undefined)).toEqual({ mode: 'block' });
      expect(resolveTrackingEnforcementMode(null)).toEqual({ mode: 'block' });
      expect(resolveTrackingEnforcementMode('   ')).toEqual({ mode: 'block' });
    });

    it('aceita `warn` e `block` sem diferenciar caixa nem espacos', () => {
      expect(resolveTrackingEnforcementMode('warn')).toEqual({ mode: 'warn' });
      expect(resolveTrackingEnforcementMode('  WARN ')).toEqual({ mode: 'warn' });
      expect(resolveTrackingEnforcementMode('Block')).toEqual({ mode: 'block' });
    });

    // Um typo jamais pode DESLIGAR uma regra fiscal em silencio: o valor
    // desconhecido cai no lado seguro e devolve `invalidValue` para o log.
    it('valor invalido cai em `block` e preserva o valor recebido para log', () => {
      expect(resolveTrackingEnforcementMode('blok')).toEqual({ mode: 'block', invalidValue: 'blok' });
      expect(resolveTrackingEnforcementMode('false')).toEqual({ mode: 'block', invalidValue: 'false' });
    });
  });

  describe('funcoes puras de horas e taxa', () => {
    it('computeStepHours devolve null (e nao 0) quando a duracao nao e mensuravel', () => {
      expect(computeStepHours(completedStep())).toBeCloseTo(2, 6);
      expect(computeStepHours(completedStep({ started_at: null }))).toBeNull();
      expect(computeStepHours(completedStep({ finished_at: null }))).toBeNull();
      // Duracao zero: inicio e fim no mesmo instante.
      expect(computeStepHours(completedStep({ finished_at: new Date('2026-08-19T08:00:00Z') }))).toBeNull();
      // Fim antes do inicio.
      expect(computeStepHours(completedStep({ finished_at: new Date('2026-08-19T07:00:00Z') }))).toBeNull();
    });

    it('resolveStepLaborRate prioriza o centro de trabalho e cai no fallback global', () => {
      expect(resolveStepLaborRate(completedStep(), 40)).toEqual({ rate: 50, source: 'work_center' });
      expect(resolveStepLaborRate(completedStep({ routeStep: null }), 40)).toEqual({ rate: 40, source: 'default_labor_rate' });
      // Centro com custo zero NAO cai no fallback (comportamento historico
      // preservado) — resolve para null e vira erro de configuracao.
      expect(resolveStepLaborRate(completedStep({ routeStep: { workCenter: { cost_per_hour: 0 } } }), 40)).toBeNull();
      expect(resolveStepLaborRate(completedStep({ routeStep: null }), 0)).toBeNull();
    });
  });

  describe('bloqueio da conclusao (modo padrao `block`)', () => {
    it('OP sem NENHUM apontamento nao conclui — e nada e gravado', async () => {
      const repo = makeRepo([]);

      const error = await completeAndCatch(repo);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error.statusCode).toBe(422);
      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_REQUIRED);
      expect(error.details.orderNumber).toBe('OP-2026-0007');
      await expectNothingWasWritten(repo);
    });

    it('apontamento existente mas com TODAS as etapas puladas nao conclui', async () => {
      const repo = makeRepo([
        { id: 1, sequence: 1, status: 'skipped' },
        { id: 2, sequence: 2, status: 'skipped' },
      ]);

      const error = await completeAndCatch(repo);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_NO_COMPLETED_STEP);
      expect(error.details.steps).toHaveLength(2);
      await expectNothingWasWritten(repo);
    });

    it('etapa em aberto nao conclui, e o erro lista TODAS as pendentes', async () => {
      const repo = makeRepo([
        completedStep(),
        { id: 11, sequence: 2, status: 'in_progress' },
        { id: 12, sequence: 3, status: 'pending' },
      ]);

      const error = await completeAndCatch(repo);

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_STEP_OPEN);
      expect(error.details.open_steps).toEqual([
        { id: 11, sequence: 2, status: 'in_progress' },
        { id: 12, sequence: 3, status: 'pending' },
      ]);
      await expectNothingWasWritten(repo);
    });

    it('etapa concluida SEM tempo apontado nao conclui (custo de MO sairia incompleto)', async () => {
      const repo = makeRepo([completedStep({ started_at: null, finished_at: null })]);

      const error = await completeAndCatch(repo);

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_TIME_MISSING);
      expect(error.details.steps).toEqual([{ id: 10, sequence: 1, started_at: null, finished_at: null }]);
      await expectNothingWasWritten(repo);
    });

    it('etapa concluida com duracao nao positiva tambem nao conclui', async () => {
      const repo = makeRepo([completedStep({ finished_at: new Date('2026-08-19T08:00:00Z') })]);

      const error = await completeAndCatch(repo);

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_TIME_MISSING);
      await expectNothingWasWritten(repo);
    });

    it('sem taxa horaria configurada nao conclui — zero silencioso vira erro explicito', async () => {
      // Centro de trabalho com custo zero E fallback global zero (o default de
      // `production_cost_settings` mockado neste arquivo).
      const repo = makeRepo([completedStep({ routeStep: { id: 100, work_center_id: 5, workCenter: { id: 5, cost_per_hour: 0 } } })]);

      const error = await completeAndCatch(repo);

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.LABOR_RATE_MISSING);
      expect(error.details.default_labor_rate_per_hour).toBe(0);
      expect(error.details.steps[0]).toMatchObject({ id: 10, work_center_id: 5, work_center_cost_per_hour: 0 });
      await expectNothingWasWritten(repo);
    });

    it('quantidade produzida acima da apontada na ultima etapa nao conclui', async () => {
      const repo = makeRepo([completedStep({ quantity_good: 8 })]);

      const error = await completeAndCatch(repo, { quantity_produced: 10 });

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_QUANTITY_EXCEEDS);
      expect(error.details).toMatchObject({ last_step_sequence: 1, last_step_quantity_good: 8, quantity_produced: 10 });
      await expectNothingWasWritten(repo);
    });

    it('etapa sem centro de trabalho passa quando ha taxa padrao configurada (fallback global)', async () => {
      ProductionCostSettings.findByPk.mockResolvedValue({
        overhead_calculation_basis: 'material_labor',
        overhead_rate_percent: 0,
        default_labor_rate_per_hour: 40,
        get: function () { return this; },
      });
      const repo = makeRepo([completedStep({ routeStep: null })]);

      const error = await completeAndCatch(repo);

      expect(error).toBeUndefined();
      expect(repo.update).toHaveBeenCalled();
    });
  });

  describe('caminho feliz completo', () => {
    it('liberacao materializa as etapas do roteiro ativo como apontamentos pendentes', async () => {
      const repo = makeRepo([], {
        findByIdForUpdate: jest.fn(async () => ({
          id: 7,
          status: 'planned',
          order_number: 'OP-2026-0007',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-31'),
          get: function () { return this; },
        })),
        findActiveRouteWithStepsByProduct: jest.fn(async () => ({
          id: 55,
          route_code: 'ROT-AF12',
          revision: '01',
          status: 'active',
          steps: [
            { id: 101, sequence: 1, step_code: '010', name: 'Bobinagem', is_active: true },
            { id: 102, sequence: 2, step_code: '020', name: 'Colagem', is_active: true },
          ],
        })),
      });

      BomService.explodeBOM.mockResolvedValue({ components: [{ component_id: 101, quantity: 5 }] });

      const useCase = new ChangeProductionOrderStatusUseCase(repo);
      await useCase.execute({ id: 7, status: 'released', user_id: 3 });

      expect(repo.findActiveRouteWithStepsByProduct).toHaveBeenCalledWith(1, expect.anything());
      const rows = repo.bulkCreateTracking.mock.calls[0][0];
      expect(rows).toHaveLength(2);
      // `production_route_step_id` e o que amarra o apontamento a REVISAO
      // efetivamente executada — o vinculo "como executado" que
      // `production_orders` nao tem por falta de coluna.
      expect(rows[0]).toMatchObject({ production_order_id: 7, production_route_step_id: 101, sequence: 1, status: 'pending' });
      expect(rows[1]).toMatchObject({ production_order_id: 7, production_route_step_id: 102, sequence: 2, status: 'pending' });
      expect(repo.update).toHaveBeenCalledWith(7, expect.objectContaining({ production_route_id: 55 }), expect.anything());
      for (const row of rows) {
        expect(TRACKING_STATUS_ENUM).toContain(row.status);
      }
    });

    it('liberacao NAO recria apontamento quando a OP ja tem etapas (idempotente)', async () => {
      const repo = makeRepo([completedStep()], {
        findByIdForUpdate: jest.fn(async () => ({
          id: 7,
          status: 'planned',
          order_number: 'OP-2026-0007',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-31'),
          get: function () { return this; },
        })),
      });

      BomService.explodeBOM.mockResolvedValue({ components: [] });

      const useCase = new ChangeProductionOrderStatusUseCase(repo);
      await useCase.execute({ id: 7, status: 'released', user_id: 3 });

      expect(repo.bulkCreateTracking).not.toHaveBeenCalled();
      expect(repo.findActiveRouteWithStepsByProduct).not.toHaveBeenCalled();
    });

    it('liberacao sem roteiro ativo nao trava a fabrica — o bloqueio mora na conclusao', async () => {
      const repo = makeRepo([], {
        findByIdForUpdate: jest.fn(async () => ({
          id: 7,
          status: 'planned',
          order_number: 'OP-2026-0007',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-31'),
          get: function () { return this; },
        })),
        findActiveRouteWithStepsByProduct: jest.fn(async () => null),
      });

      BomService.explodeBOM.mockResolvedValue({ components: [] });

      const useCase = new ChangeProductionOrderStatusUseCase(repo);
      await expect(useCase.execute({ id: 7, status: 'released', user_id: 3 })).resolves.toBeDefined();
      expect(repo.bulkCreateTracking).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalled();
    });

    it('conclusao com apontamento completo grava consumo, produto acabado, lote e custo de MO REAL', async () => {
      ProductionCostSettings.findByPk.mockResolvedValue({
        overhead_calculation_basis: 'material_labor',
        overhead_rate_percent: 10,
        default_labor_rate_per_hour: 0,
        get: function () { return this; },
      });
      BomService.explodeBOM.mockResolvedValue({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 200,
      });
      LotControl.findOne.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-INSUMO-001',
        status: 'available',
        expires_at: null,
        quantity_available: 10,
        update: jest.fn(async () => ({})),
      });

      const repo = makeRepo([completedStep()]); // 2h x 50/h = 100 de mao-de-obra

      const error = await completeAndCatch(repo, {
        lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
        finished_lot_number: 'LOT-FG-0007',
      });

      expect(error).toBeUndefined();

      // Consumo de insumo saindo do deposito INSUMOS (id 1).
      expect(InventoryService.consume).toHaveBeenCalledWith(101, 5, 3, expect.anything(), expect.objectContaining({ referenceType: 'production' }));
      expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledWith(101, 1, 5, expect.anything());
      // Produto acabado entrando em ACABADOS (id 2).
      expect(InventoryService.receive).toHaveBeenCalledWith(1, 10, 3, expect.anything(), expect.any(Object));
      expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(1, 2, 10, expect.anything());
      // Lote de produto acabado criado e consumo rastreado.
      expect(LotControl.create).toHaveBeenCalled();
      expect(ProductionLotConsumption.create).toHaveBeenCalled();
      // Custeio: material + mao-de-obra REAL (nao zero) + overhead.
      expect(CostingService.registerWeightedAverageCost).toHaveBeenCalled();
      const laborCall = CostingService.registerAdditionalProductionCost.mock.calls
        .find((call: any[]) => call[0].sourceType === 'production_labor');
      expect(laborCall).toBeDefined();
      // 2h x 50/h = 100 total / 10 unidades = 10 por unidade.
      expect(laborCall[0].unitCost).toBeCloseTo(10, 6);
      // OP marcada concluida e transacao confirmada.
      expect(repo.update).toHaveBeenCalledWith(7, expect.objectContaining({ status: 'completed', quantity_produced: 10 }), expect.anything());
      const transaction = await lastTransaction();
      expect(transaction.commit).toHaveBeenCalled();
      expect(transaction.rollback).not.toHaveBeenCalled();
    });
  });

  describe('janela de transicao (PRODUCTION_TRACKING_REQUIRED=warn)', () => {
    beforeEach(() => {
      process.env.PRODUCTION_TRACKING_REQUIRED = 'warn';
    });

    it('conclui OP sem apontamento (comportamento historico preservado)', async () => {
      const repo = makeRepo([]);

      const error = await completeAndCatch(repo);

      expect(error).toBeUndefined();
      expect(repo.update).toHaveBeenCalledWith(7, expect.objectContaining({ status: 'completed' }), expect.anything());
    });

    it('NAO materializa etapas na liberacao — senao a janela seria inutil', async () => {
      const repo = makeRepo([], {
        findByIdForUpdate: jest.fn(async () => ({
          id: 7,
          status: 'planned',
          order_number: 'OP-2026-0007',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-31'),
          get: function () { return this; },
        })),
      });
      BomService.explodeBOM.mockResolvedValue({ components: [] });

      const useCase = new ChangeProductionOrderStatusUseCase(repo);
      await useCase.execute({ id: 7, status: 'released', user_id: 3 });

      expect(repo.bulkCreateTracking).not.toHaveBeenCalled();
      expect(repo.findActiveRouteWithStepsByProduct).not.toHaveBeenCalled();
    });

    // As duas regras abaixo sao ANTERIORES ao G4 (reconciliacao 1.3) e por isso
    // nao fazem parte da janela de transicao.
    it('continua bloqueando etapa em aberto', async () => {
      const repo = makeRepo([completedStep(), { id: 11, sequence: 2, status: 'paused' }]);

      const error = await completeAndCatch(repo);

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_STEP_OPEN);
      await expectNothingWasWritten(repo);
    });

    it('continua bloqueando quantidade acima da apontada', async () => {
      const repo = makeRepo([completedStep({ quantity_good: 4 })]);

      const error = await completeAndCatch(repo, { quantity_produced: 10 });

      expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.TRACKING_QUANTITY_EXCEEDS);
      await expectNothingWasWritten(repo);
    });
  });
});
