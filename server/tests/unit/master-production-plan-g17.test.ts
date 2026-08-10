/**
 * G17 — Plano Mestre de Produção (MPS): a camada de decisão entre a carteira
 * de pedidos e a ordem de produção (decisão D-F do dono do produto,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * O que estas suítes provam:
 *
 * 1. **O plano consolida demanda de venda E estoque mínimo** — as duas fontes
 *    que, até o G17, nada no ERP lia (o MRP só calculava contra a demanda
 *    digitada no payload, e confirmar venda não produzia efeito nenhum na
 *    fábrica). É o critério de aceite explícito desta entrega.
 * 2. **O saldo usado desconta quarentena e reserva** — o mesmo saldo de
 *    planejamento imposto pelo G7/G3/G9. Planejar contra `products.quantity`
 *    cru seria planejar em cima de material que a produção não pode consumir.
 * 3. **O plano não decide sozinho**: a linha nasce `pending` com
 *    `planned_quantity = 0`, e firmar um plano sem decisão é recusado. Não
 *    existe caminho de OP automática na confirmação da venda.
 * 4. **A decisão do humano nunca sobrescreve a sugestão do sistema** — é a
 *    divergência entre as duas que uma auditoria de PCP procura.
 * 5. **A liberação é tudo ou nada e NADA é escrito quando alguma linha está
 *    bloqueada** — não basta lançar erro: se o caso de uso escrevesse antes de
 *    checar, metade das OPs nasceria e o status do plano mentiria.
 * 6. **A OP gerada carrega o rastro de origem** (`production_order_id` na
 *    linha) e **não** finge vínculo com um pedido de venda específico
 *    (`sales_order_id` NULL): a demanda é consolidada de vários pedidos.
 *
 * ⚠️ Todo teste de erro afirma `details.rule === 'G17'`. Sem isso, um mock
 * incompleto que derrubasse o caso de uso com `TypeError` faria o teste passar
 * pelo motivo errado — a classe de defeito catalogada em
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
 *
 * @module tests/unit/master-production-plan-g17
 */

jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const tx = { id: 'tx-mps', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() };
      return callback ? callback(tx) : tx;
    }),
  },
}));

jest.mock('../../src/services/bomService', () => ({
  checkAvailability: jest.fn(async () => ({ available: true, max_possible_quantity: 999, missing_items: [] })),
  explodeBOM: jest.fn(),
}));

import CreateMasterProductionPlanUseCase = require('../../src/modules/masterProduction/application/use-cases/CreateMasterProductionPlanUseCase');
import DecideMasterProductionPlanLineUseCase = require('../../src/modules/masterProduction/application/use-cases/DecideMasterProductionPlanLineUseCase');
import ChangeMasterProductionPlanStatusUseCase = require('../../src/modules/masterProduction/application/use-cases/ChangeMasterProductionPlanStatusUseCase');
import ReleaseMasterProductionPlanUseCase = require('../../src/modules/masterProduction/application/use-cases/ReleaseMasterProductionPlanUseCase');
import ListMasterProductionPlansUseCase = require('../../src/modules/masterProduction/application/use-cases/ListMasterProductionPlansUseCase');
import GetMasterProductionPlanUseCase = require('../../src/modules/masterProduction/application/use-cases/GetMasterProductionPlanUseCase');
import { BusinessRuleError, NotFoundError, ValidationError } from '../../src/errors';
import {
  BACKLOG_SALE_STATUSES,
  MASTER_PLAN_RULE,
  OPEN_PRODUCTION_ORDER_STATUSES,
  PLANNABLE_PRODUCT_TYPES,
  canTransitionPlan,
  consolidateLineFigures,
  isPlanEditable,
} from '../../src/modules/masterProduction/domain/constants';

const BomService: any = require('../../src/services/bomService');

/** Id do planejador logado (JWT) usado em todos os cenários. */
const PLANNER_ID = 7;

/**
 * Monta um produto planejável mockado.
 *
 * @param overrides - Campos a sobrescrever.
 * @returns Produto no formato devolvido pelo repositório.
 */
function buildProduct(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    code: 'ALTO-15',
    name: 'Alto-falante 15"',
    product_type: 'finished',
    status: 'active',
    quantity: 0,
    reserved_quantity: 0,
    min_quantity: 0,
    unit: 'un',
    lead_time: 0,
    ...overrides,
  };
}

/**
 * Repositório do plano mestre mockado — PROPOSITALMENTE completo para os
 * caminhos exercitados, para que uma falha nunca venha de método ausente.
 *
 * @param overrides - Implementações específicas do cenário.
 * @returns Dublê com todos os métodos usados pelos casos de uso.
 */
function buildPlanRepository(overrides: Record<string, any> = {}) {
  const createdLines: any[] = [];

  return {
    sumSalesBacklogByProduct: jest.fn(async () => new Map<number, number>()),
    sumOpenProductionByProduct: jest.fn(async () => new Map<number, number>()),
    listProductsWithSafetyStock: jest.fn(async () => [] as any[]),
    findProductsByIds: jest.fn(async () => [] as any[]),
    sumWithheldByProduct: jest.fn(async () => new Map<number, number>()),
    nextPlanNumberForYear: jest.fn(async () => 'MPS-2026-0001'),
    createPlan: jest.fn(async (data: any) => ({
      id: 1,
      ...data,
      get: () => ({ id: 1, ...data }),
    })),
    createPlanLines: jest.fn(async (lines: any[]) => {
      lines.forEach((line, index) => createdLines.push({ id: 100 + index, ...line }));
      return createdLines;
    }),
    findPlanById: jest.fn(async () => null),
    findPlanByIdRaw: jest.fn(async () => null),
    findPlanByIdForUpdate: jest.fn(async () => null),
    listPlans: jest.fn(async () => ({ rows: [], count: 0 })),
    updatePlan: jest.fn(async () => 1),
    findLineById: jest.fn(async () => null),
    listLinesByPlan: jest.fn(async () => [] as any[]),
    updateLine: jest.fn(async (lineId: any, data: any) => ({ id: lineId, ...data })),
    ...overrides,
  };
}

/**
 * Monta um plano mockado com `get({ plain: true })`.
 *
 * @param overrides - Campos a sobrescrever (ex.: `status`).
 * @returns Plano no formato devolvido pelo repositório.
 */
function buildPlan(overrides: Record<string, any> = {}) {
  const plan = {
    id: 1,
    plan_number: 'MPS-2026-0001',
    status: 'draft',
    horizon_start: '2026-08-10',
    horizon_end: '2026-09-10',
    planner_id: PLANNER_ID,
    ...overrides,
  };
  return { ...plan, get: () => ({ ...plan }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  BomService.checkAvailability.mockResolvedValue({ available: true, max_possible_quantity: 999, missing_items: [] });
});

describe('G17 — regras puras de consolidação', () => {
  it('soma carteira de pedidos + estoque mínimo + previsão na necessidade bruta', () => {
    const figures = consolidateLineFigures({
      salesBacklog: 100,
      safetyStock: 20,
      forecast: 5,
    });

    expect(figures.demand_sales_orders).toBe(100);
    expect(figures.demand_safety_stock).toBe(20);
    expect(figures.demand_forecast).toBe(5);
    expect(figures.gross_requirement).toBe(125);
  });

  it('desconta quarentena e reserva do saldo disponível (nunca usa o saldo físico cru)', () => {
    const figures = consolidateLineFigures({
      salesBacklog: 100,
      physicalOnHand: 80,
      withheld: 30,   // material em quarentena/bloqueado (G7)
      reserved: 20,   // reserva viva por OP/venda (G3/G9)
    });

    // 80 físico − 30 retido − 20 reservado = 30 realmente disponível.
    expect(figures.supply_on_hand).toBe(30);
    expect(figures.supply_withheld).toBe(30);
    expect(figures.supply_reserved).toBe(20);
    // Usar o saldo físico daria necessidade 20; o correto é 70.
    expect(figures.net_requirement).toBe(70);
  });

  it('confronta com o que já está em produção antes de sugerir', () => {
    const figures = consolidateLineFigures({
      salesBacklog: 100,
      physicalOnHand: 10,
      inProduction: 40,
    });

    expect(figures.supply_in_production).toBe(40);
    expect(figures.net_requirement).toBe(50);
    expect(figures.suggested_quantity).toBe(50);
  });

  it('nunca produz saldo disponível negativo nem necessidade negativa', () => {
    const figures = consolidateLineFigures({
      salesBacklog: 5,
      physicalOnHand: 10,
      withheld: 999,   // drift entre lot_controls e products.quantity
      reserved: 999,
      inProduction: 1000,
    });

    expect(figures.supply_on_hand).toBe(0);
    expect(figures.net_requirement).toBe(0);
    expect(figures.suggested_quantity).toBe(0);
  });

  it('a sugestão é a necessidade líquida crua — sem arredondamento de lote (política não decidida pelo dono)', () => {
    const figures = consolidateLineFigures({ salesBacklog: 7.5 });
    expect(figures.suggested_quantity).toBe(7.5);
  });

  it('a máquina de estados do plano só permite as transições declaradas', () => {
    expect(canTransitionPlan('draft', 'firm')).toBe(true);
    expect(canTransitionPlan('draft', 'canceled')).toBe(true);
    expect(canTransitionPlan('firm', 'released')).toBe(true);
    expect(canTransitionPlan('draft', 'released')).toBe(false);
    expect(canTransitionPlan('released', 'firm')).toBe(false);
    expect(canTransitionPlan('canceled', 'draft')).toBe(false);
    expect(isPlanEditable('draft')).toBe(true);
    expect(isPlanEditable('firm')).toBe(false);
  });

  it('os literais de ENUM usados em WHERE espelham o banco (guarda contra a classe de defeito de 2026-08-10)', () => {
    // Conferidos contra `pg_enum` no banco real:
    //   enum_sales_status = quote,confirmed,invoiced,canceled,shipped,partially_invoiced
    //   enum_production_orders_status = planned,released,in_progress,completed,paused,canceled
    //   enum_products_product_type = finished,semi_finished,component,raw_material
    expect([...BACKLOG_SALE_STATUSES]).toEqual(['confirmed', 'partially_invoiced']);
    expect([...OPEN_PRODUCTION_ORDER_STATUSES]).toEqual(['planned', 'released', 'in_progress', 'paused']);
    expect([...PLANNABLE_PRODUCT_TYPES]).toEqual(['finished', 'semi_finished']);
  });
});

describe('G17 — CreateMasterProductionPlanUseCase (consolidação da demanda)', () => {
  it('consolida a demanda da CARTEIRA DE PEDIDOS e do ESTOQUE MÍNIMO no mesmo plano', async () => {
    const comCarteira = buildProduct({ id: 10, code: 'ALTO-15', min_quantity: 0 });
    const comMinimo = buildProduct({ id: 20, code: 'ALTO-12', min_quantity: 15 });

    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 40]])),
      listProductsWithSafetyStock: jest.fn(async () => [comMinimo]),
      findProductsByIds: jest.fn(async () => [comCarteira]),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    });

    const byProduct = new Map(result.lines.map((line: any) => [line.product_id, line]));

    expect(byProduct.size).toBe(2);
    // Demanda que veio da venda confirmada e ainda não faturada.
    expect((byProduct.get(10) as any).demand_sales_orders).toBe(40);
    expect((byProduct.get(10) as any).demand_safety_stock).toBe(0);
    // Demanda que veio do estoque mínimo — a fonte que nada lia antes do G17.
    expect((byProduct.get(20) as any).demand_safety_stock).toBe(15);
    expect((byProduct.get(20) as any).demand_sales_orders).toBe(0);
    expect((byProduct.get(20) as any).suggested_quantity).toBe(15);
  });

  it('soma carteira + estoque mínimo + previsão manual quando as três incidem no mesmo produto', async () => {
    const produto = buildProduct({ id: 10, min_quantity: 10 });

    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 30]])),
      listProductsWithSafetyStock: jest.fn(async () => [produto]),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      forecast_demands: [{ product_id: 10, quantity: 5 }],
      plannerId: PLANNER_ID,
    });

    expect(result.lines[0].gross_requirement).toBe(45);
    expect(result.lines[0].demand_forecast).toBe(5);
  });

  it('usa o saldo de planejamento: desconta quarentena e reserva do estoque do produto', async () => {
    const produto = buildProduct({ id: 10, min_quantity: 0, quantity: 100, reserved_quantity: 25 });

    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 90]])),
      findProductsByIds: jest.fn(async () => [produto]),
      // 40 unidades em quarentena/bloqueio (G7).
      sumWithheldByProduct: jest.fn(async () => new Map([[10, 40]])),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    });

    const line = result.lines[0];
    // 100 físico − 40 retido − 25 reservado = 35 disponíveis para planejar.
    expect(line.supply_on_hand).toBe(35);
    expect(line.supply_withheld).toBe(40);
    expect(line.supply_reserved).toBe(25);
    // Contra o saldo físico a necessidade seria 0 (90 < 100); com o saldo de
    // planejamento, são 55 — o material em quarentena não pode ser consumido.
    expect(line.net_requirement).toBe(55);
    expect(repository.sumWithheldByProduct).toHaveBeenCalledWith([10]);
  });

  it('desconta o saldo das OPs abertas para não mandar produzir o que já está na fábrica', async () => {
    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 100]])),
      sumOpenProductionByProduct: jest.fn(async () => new Map([[10, 60]])),
      findProductsByIds: jest.fn(async () => [buildProduct({ id: 10 })]),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    });

    expect(result.lines[0].supply_in_production).toBe(60);
    expect(result.lines[0].net_requirement).toBe(40);
  });

  it('a linha nasce SEM decisão tomada (pending, planned_quantity = 0) mesmo com sugestão positiva', async () => {
    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 50]])),
      findProductsByIds: jest.fn(async () => [buildProduct({ id: 10 })]),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    });

    expect(result.lines[0].suggested_quantity).toBe(50);
    expect(result.lines[0].planned_quantity).toBe(0);
    expect(result.lines[0].status).toBe('pending');
  });

  it('o planejador vem do JWT e é gravado no plano (anti-spoofing P0)', async () => {
    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 5]])),
      findProductsByIds: jest.fn(async () => [buildProduct({ id: 10 })]),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    });

    expect(repository.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({ planner_id: PLANNER_ID, status: 'draft' }),
      expect.anything(),
    );
  });

  it('produto que não é de fabricação própria entra em `skipped`, nunca some em silêncio', async () => {
    const materiaPrima = buildProduct({ id: 30, code: 'IMA-FERRITE', product_type: 'raw_material' });

    const repository = buildPlanRepository({
      sumSalesBacklogByProduct: jest.fn(async () => new Map([[10, 5], [30, 200]])),
      findProductsByIds: jest.fn(async () => [buildProduct({ id: 10 }), materiaPrima]),
    });

    const useCase = new CreateMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    });

    expect(result.lines).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ product_id: 30, reason: 'not_manufactured', product_type: 'raw_material' }),
    ]);
  });

  it('recusa horizonte ausente com details.rule G17', async () => {
    const useCase = new CreateMasterProductionPlanUseCase(buildPlanRepository() as any);

    await expect(useCase.execute({ horizon_end: '2026-09-10', plannerId: PLANNER_ID } as any))
      .rejects.toThrow(ValidationError);

    await useCase.execute({ horizon_end: '2026-09-10', plannerId: PLANNER_ID } as any).catch((error: any) => {
      expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      expect(error.details.field).toBe('horizon_start');
    });
  });

  it('recusa horizonte invertido com details.rule G17', async () => {
    const useCase = new CreateMasterProductionPlanUseCase(buildPlanRepository() as any);

    await useCase.execute({
      horizon_start: '2026-09-10',
      horizon_end: '2026-08-10',
      plannerId: PLANNER_ID,
    }).then(
      () => { throw new Error('deveria ter recusado o horizonte invertido'); },
      (error: any) => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.field).toBe('horizon_end');
      },
    );
  });

  it('recusa previsão manual com quantidade não positiva, com details.rule G17', async () => {
    const useCase = new CreateMasterProductionPlanUseCase(buildPlanRepository() as any);

    await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      forecast_demands: [{ product_id: 10, quantity: 0 }],
      plannerId: PLANNER_ID,
    }).then(
      () => { throw new Error('deveria ter recusado a previsão com quantidade zero'); },
      (error: any) => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.field).toBe('forecast_demands.quantity');
      },
    );
  });

  it('recusa abrir plano sem demanda nenhuma, com details.rule G17, e nada é gravado', async () => {
    const repository = buildPlanRepository();
    const useCase = new CreateMasterProductionPlanUseCase(repository as any);

    await useCase.execute({
      horizon_start: '2026-08-10',
      horizon_end: '2026-09-10',
      plannerId: PLANNER_ID,
    }).then(
      () => { throw new Error('deveria ter recusado o plano vazio'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      },
    );

    expect(repository.createPlan).not.toHaveBeenCalled();
    expect(repository.createPlanLines).not.toHaveBeenCalled();
  });
});

describe('G17 — DecideMasterProductionPlanLineUseCase (a decisão do planejador)', () => {
  /**
   * Monta um repositório com plano em `draft` e uma linha pendente.
   *
   * @param planOverrides - Campos do plano.
   * @param lineOverrides - Campos da linha.
   */
  function buildDecisionRepository(planOverrides: any = {}, lineOverrides: any = {}) {
    const plan = buildPlan(planOverrides);
    const line = {
      id: 100,
      plan_id: plan.id,
      product_id: 10,
      suggested_quantity: 50,
      planned_quantity: 0,
      status: 'pending',
      due_date: '2026-09-10',
      ...lineOverrides,
    };

    return buildPlanRepository({
      findPlanByIdRaw: jest.fn(async () => plan),
      findLineById: jest.fn(async () => line),
      updateLine: jest.fn(async (lineId: any, data: any) => ({ ...line, id: lineId, ...data })),
    });
  }

  it('registra a decisão de produzir: status planned, quantidade do planejador e decided_by do JWT', async () => {
    const repository = buildDecisionRepository();
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    const line = await useCase.execute({
      planId: 1,
      lineId: 100,
      planned_quantity: 60,
      decidedBy: PLANNER_ID,
    });

    expect(line.status).toBe('planned');
    expect(line.planned_quantity).toBe(60);
    expect(line.decided_by).toBe(PLANNER_ID);
    // A sugestão do sistema permanece intacta: é a divergência entre 50 e 60
    // que uma auditoria de PCP quer enxergar.
    expect(line.suggested_quantity).toBe(50);
  });

  it('registra a decisão de NÃO produzir como `dismissed` (diferente de "ninguém olhou")', async () => {
    const repository = buildDecisionRepository();
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    const line = await useCase.execute({ planId: 1, lineId: 100, dismiss: true, decidedBy: PLANNER_ID });

    expect(line.status).toBe('dismissed');
    expect(line.planned_quantity).toBe(0);
  });

  it('quantidade zero é decisão de não produzir, não uma linha "a produzir 0"', async () => {
    const repository = buildDecisionRepository();
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    const line = await useCase.execute({ planId: 1, lineId: 100, planned_quantity: 0, decidedBy: PLANNER_ID });

    expect(line.status).toBe('dismissed');
  });

  it('recusa alterar linha de plano já firmado, com details.rule G17', async () => {
    const repository = buildDecisionRepository({ status: 'firm' });
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    await useCase.execute({ planId: 1, lineId: 100, planned_quantity: 10, decidedBy: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado a edição de plano firmado'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.status).toBe('firm');
      },
    );

    expect(repository.updateLine).not.toHaveBeenCalled();
  });

  it('recusa decisão contraditória (quantidade + dismiss) com details.rule G17', async () => {
    const repository = buildDecisionRepository();
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    await useCase.execute({ planId: 1, lineId: 100, planned_quantity: 10, dismiss: true, decidedBy: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado a decisão contraditória'); },
      (error: any) => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      },
    );
  });

  it('recusa payload sem decisão nenhuma, com details.rule G17', async () => {
    const repository = buildDecisionRepository();
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    await useCase.execute({ planId: 1, lineId: 100, decidedBy: PLANNER_ID }).then(
      () => { throw new Error('deveria ter exigido uma decisão'); },
      (error: any) => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.field).toBe('planned_quantity');
      },
    );
  });

  it('recusa linha de outro plano com NotFound e details.rule G17', async () => {
    const repository = buildDecisionRepository({}, { plan_id: 999 });
    const useCase = new DecideMasterProductionPlanLineUseCase(repository as any);

    await useCase.execute({ planId: 1, lineId: 100, planned_quantity: 5, decidedBy: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado linha de outro plano'); },
      (error: any) => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      },
    );
  });
});

describe('G17 — ChangeMasterProductionPlanStatusUseCase (firmar/cancelar)', () => {
  it('recusa firmar plano em que ninguém decidiu nada, com details.rule G17', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'draft' })),
      listLinesByPlan: jest.fn(async () => [
        { id: 100, status: 'pending', planned_quantity: 0 },
        { id: 101, status: 'dismissed', planned_quantity: 0 },
      ]),
    });
    const useCase = new ChangeMasterProductionPlanStatusUseCase(repository as any);

    await useCase.execute({ planId: 1, targetStatus: 'firm', userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado firmar plano sem decisão'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.decided_lines).toBe(0);
      },
    );

    expect(repository.updatePlan).not.toHaveBeenCalled();
  });

  it('firma o plano quando há decisão registrada, gravando firmed_by do JWT', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'draft' })),
      listLinesByPlan: jest.fn(async () => [{ id: 100, status: 'planned', planned_quantity: 60 }]),
    });
    const useCase = new ChangeMasterProductionPlanStatusUseCase(repository as any);

    const plan = await useCase.execute({ planId: 1, targetStatus: 'firm', userId: PLANNER_ID });

    expect(plan.status).toBe('firm');
    expect(repository.updatePlan).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'firm', firmed_by: PLANNER_ID }),
      expect.anything(),
    );
  });

  it('recusa transição fora da máquina de estados, com details.rule G17', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'released' })),
    });
    const useCase = new ChangeMasterProductionPlanStatusUseCase(repository as any);

    await useCase.execute({ planId: 1, targetStatus: 'firm', userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado released -> firm'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.current_status).toBe('released');
      },
    );
  });

  it('recusa plano inexistente com NotFound e details.rule G17', async () => {
    const repository = buildPlanRepository({ findPlanByIdForUpdate: jest.fn(async () => null) });
    const useCase = new ChangeMasterProductionPlanStatusUseCase(repository as any);

    await useCase.execute({ planId: 404, targetStatus: 'firm', userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado plano inexistente'); },
      (error: any) => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      },
    );
  });
});

describe('G17 — ReleaseMasterProductionPlanUseCase (a decisão vira Ordem de Produção)', () => {
  /**
   * Repositório de OP mockado (numeração serializada + criação).
   */
  function buildProductionOrderRepository() {
    let sequence = 0;
    return {
      nextOrderNumberForYear: jest.fn(async (prefix: string) => {
        sequence += 1;
        return `${prefix}-${String(sequence).padStart(4, '0')}`;
      }),
      create: jest.fn(async (data: any) => ({ id: 900 + sequence, ...data })),
    };
  }

  /** Linha decidida e liberável. */
  function buildReleasableLine(overrides: any = {}) {
    return {
      id: 100,
      plan_id: 1,
      product_id: 10,
      planned_quantity: 60,
      status: 'planned',
      due_date: '2026-09-10',
      product: buildProduct({ id: 10 }),
      ...overrides,
    };
  }

  it('gera uma OP por linha decidida, com rastro de origem e sem fingir vínculo com um pedido de venda', async () => {
    const line = buildReleasableLine();
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'firm' })),
      listLinesByPlan: jest.fn(async () => [line]),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    const result = await useCase.execute({ planId: 1, userId: PLANNER_ID });

    expect(result.production_orders).toHaveLength(1);
    expect(productionOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 10,
        quantity: 60,
        status: 'planned',
        due_date: '2026-09-10',
        // A demanda é consolidada de VÁRIOS pedidos: apontar um só seria
        // rastreabilidade falsa.
        sales_order_id: null,
        created_by: PLANNER_ID,
      }),
      expect.anything(),
    );
    // O rastro verdadeiro: da OP se chega à linha, ao plano e ao planejador.
    expect(repository.updateLine).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ status: 'released', production_order_id: expect.anything() }),
      expect.anything(),
    );
    expect(repository.updatePlan).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'released', released_by: PLANNER_ID }),
      expect.anything(),
    );
  });

  it('ignora linhas pendentes e descartadas — só a decisão registrada vira OP', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'firm' })),
      listLinesByPlan: jest.fn(async () => [
        buildReleasableLine({ id: 100 }),
        buildReleasableLine({ id: 101, status: 'pending', planned_quantity: 0 }),
        buildReleasableLine({ id: 102, status: 'dismissed', planned_quantity: 0 }),
      ]),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    const result = await useCase.execute({ planId: 1, userId: PLANNER_ID });

    expect(result.released_lines).toEqual([100]);
    expect(productionOrderRepository.create).toHaveBeenCalledTimes(1);
  });

  it('recusa liberar plano que não está firmado, com details.rule G17', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'draft' })),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    await useCase.execute({ planId: 1, userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado liberar plano em rascunho'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.required_status).toBe('firm');
      },
    );

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('produto sem BOM ativa bloqueia a liberação INTEIRA e NENHUMA OP é criada', async () => {
    const semBom: any = new Error('BOM nao encontrada');
    semBom.statusCode = 404;
    BomService.checkAvailability
      .mockResolvedValueOnce({ available: true, max_possible_quantity: 999, missing_items: [] })
      .mockRejectedValueOnce(semBom);

    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'firm' })),
      listLinesByPlan: jest.fn(async () => [
        buildReleasableLine({ id: 100 }),
        buildReleasableLine({ id: 101, product_id: 20, product: buildProduct({ id: 20, code: 'ALTO-12' }) }),
      ]),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    await useCase.execute({ planId: 1, userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter bloqueado a liberação'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.blocked_lines).toEqual([
          expect.objectContaining({ line_id: 101, reason: 'no_active_bom' }),
        ]);
      },
    );

    // Tudo ou nada: nem a linha saudável virou OP.
    expect(productionOrderRepository.create).not.toHaveBeenCalled();
    expect(repository.updatePlan).not.toHaveBeenCalled();
  });

  it('falta de material bloqueia a liberação com o motivo e o gargalo, details.rule G17', async () => {
    BomService.checkAvailability.mockResolvedValue({
      available: false,
      max_possible_quantity: 12,
      missing_items: [{ product_id: 55, code: 'BOBINA', shortage: 48 }],
    });

    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'firm' })),
      listLinesByPlan: jest.fn(async () => [buildReleasableLine()]),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    await useCase.execute({ planId: 1, userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter bloqueado por falta de material'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.blocked_lines[0]).toMatchObject({
          reason: 'insufficient_material',
          max_possible_quantity: 12,
        });
      },
    );

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('produto inativo bloqueia a linha (mesmo rigor do caminho manual e do caminho MRP)', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'firm' })),
      listLinesByPlan: jest.fn(async () => [
        buildReleasableLine({ product: buildProduct({ id: 10, status: 'inactive' }) }),
      ]),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    await useCase.execute({ planId: 1, userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter bloqueado produto inativo'); },
      (error: any) => {
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.blocked_lines[0].reason).toBe('inactive_product');
      },
    );
  });

  it('recusa liberar plano firmado sem nenhuma linha decidida, com details.rule G17', async () => {
    const repository = buildPlanRepository({
      findPlanByIdForUpdate: jest.fn(async () => buildPlan({ status: 'firm' })),
      listLinesByPlan: jest.fn(async () => [buildReleasableLine({ status: 'dismissed', planned_quantity: 0 })]),
    });
    const productionOrderRepository = buildProductionOrderRepository();

    const useCase = new ReleaseMasterProductionPlanUseCase(repository as any, productionOrderRepository as any);
    await useCase.execute({ planId: 1, userId: PLANNER_ID }).then(
      () => { throw new Error('deveria ter recusado plano sem linha decidida'); },
      (error: any) => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      },
    );
  });
});

describe('G17 — leitura (lista e detalhe)', () => {
  it('recusa filtro de status fora do ENUM com details.rule G17 (não deixa o literal chegar ao Postgres)', async () => {
    const useCase = new ListMasterProductionPlansUseCase(buildPlanRepository() as any);

    await useCase.execute({ status: 'aprovado' }).then(
      () => { throw new Error('deveria ter recusado o status inválido'); },
      (error: any) => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
        expect(error.details.field).toBe('status');
      },
    );
  });

  it('pagina a listagem com teto de 100 por página', async () => {
    const repository = buildPlanRepository({ listPlans: jest.fn(async () => ({ rows: [], count: 0 })) });
    const useCase = new ListMasterProductionPlansUseCase(repository as any);

    await useCase.execute({ page: 2, limit: 500 });

    expect(repository.listPlans).toHaveBeenCalledWith({}, { limit: 100, offset: 100 });
  });

  it('o detalhe resume o estado da decisão do plano', async () => {
    const plan = {
      id: 1,
      plan_number: 'MPS-2026-0001',
      status: 'draft',
      lines: [
        { id: 100, status: 'planned', suggested_quantity: '50', planned_quantity: '60' },
        { id: 101, status: 'pending', suggested_quantity: '10', planned_quantity: '0' },
        { id: 102, status: 'dismissed', suggested_quantity: '5', planned_quantity: '0' },
      ],
    };
    const repository = buildPlanRepository({
      findPlanById: jest.fn(async () => ({ ...plan, get: () => plan })),
    });

    const useCase = new GetMasterProductionPlanUseCase(repository as any);
    const result = await useCase.execute({ planId: 1 });

    expect(result.summary).toMatchObject({
      total_lines: 3,
      pending_lines: 1,
      planned_lines: 1,
      dismissed_lines: 1,
      total_suggested_quantity: 65,
      total_planned_quantity: 60,
    });
  });

  it('recusa detalhe de plano inexistente com NotFound e details.rule G17', async () => {
    const useCase = new GetMasterProductionPlanUseCase(buildPlanRepository() as any);

    await useCase.execute({ planId: 404 }).then(
      () => { throw new Error('deveria ter recusado plano inexistente'); },
      (error: any) => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.details.rule).toBe(MASTER_PLAN_RULE);
      },
    );
  });
});
