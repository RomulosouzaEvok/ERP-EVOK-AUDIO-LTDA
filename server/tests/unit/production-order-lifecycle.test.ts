/**
 * Test: Production Order Lifecycle (F.10 Sprint F)
 *
 * Valida o ciclo de vida de Ordens de Producao:
 * CreateProductionOrderUseCase, ChangeProductionOrderStatusUseCase, CompleteProductionTrackingUseCase.
 * Cobre: bloqueio de indisponibilidade, reserva/liberacao de materiais, rastreabilidade obrigatoria,
 * validacoes de transicao de status e gerenciamento de lotes.
 *
 * @group unit
 * @ticket F.10-Sprint-F
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      if (callback) {
        return callback({ id: 'tx-1', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() });
      }
      return { id: 'tx-1', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() };
    }),
  },
}));

jest.mock('../../src/services/bomService', () => ({
  checkAvailability: jest.fn(),
  explodeBOM: jest.fn(),
}));

// ATENCAO (armadilha ja paga caro neste projeto): este mock precisa expor
// TODAS as funcoes de `inventoryService` que o caso de uso chama. Faltando
// uma, o erro real vira "X is not a function" — que `completeOrder` embrulha
// em ConflictError — e o teste passa/falha pelo motivo errado.
jest.mock('../../src/services/inventoryService', () => ({
  reserve: jest.fn(async () => ({})),
  consume: jest.fn(async () => ({})),
  receive: jest.fn(async () => ({ product: { id: 1, name: 'Test Product', quantity: 10 } })),
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
  registerAdditionalProductionCost: jest.fn(async () => ({ ledger: { id: 2 }, previousCost: 10, newCost: 10, totalCost: 0 })),
}));

jest.mock('../../src/models/index', () => ({
  LotControl: {
    create: jest.fn(async () => ({ id: 1, lot_number: 'LOT-001', status: 'available', quantity_available: 10 })),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  ProductionLotConsumption: {
    create: jest.fn(async () => ({ id: 1 })),
  },
  SerialNumber: {
    create: jest.fn(async () => ({ id: 1, serial_number: 'SN-001' })),
  },
  ProductionCostSettings: {
    findByPk: jest.fn(async () => ({
      overhead_calculation_basis: 'material_labor',
      overhead_rate_percent: 0,
      default_labor_rate_per_hour: 0,
      get: function () { return this; },
    })),
  },
}));

import CreateProductionOrderUseCase = require('../../src/modules/production/application/use-cases/CreateProductionOrderUseCase');
import ChangeProductionOrderStatusUseCase = require('../../src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase');
import CompleteProductionTrackingUseCase = require('../../src/modules/production/application/use-cases/CompleteProductionTrackingUseCase');
import { BusinessRuleError, ValidationError, NotFoundError } from '../../src/errors';

const BomService = require('../../src/services/bomService');
const InventoryService = require('../../src/services/inventoryService');
const CostingService = require('../../src/services/costingService');
const { LotControl, ProductionLotConsumption, SerialNumber } = require('../../src/models/index');

/**
 * Apontamento minimo que ATRAVESSA o gate G4 (apontamento obrigatorio,
 * 2026-08-10).
 *
 * Desde o G4, concluir OP sem apontamento e `G4-TRACKING-REQUIRED`. Sem este
 * lastro, TODO teste de conclusao deste arquivo passaria a falhar (ou pior, a
 * "passar") pelo gate em vez de pela regra que ele afirma cobrir — a armadilha
 * de teste verde pelo motivo errado ja documentada neste projeto.
 *
 * Os quatro campos abaixo nao sao decorativos, cada um satisfaz uma regra:
 * `status: 'completed'` → `G4-TRACKING-NO-COMPLETED`; `quantity_good` →
 * `G4-TRACKING-QTY-EXCEEDS`; `started_at`/`finished_at` →
 * `G4-TRACKING-TIME-MISSING`; `workCenter.cost_per_hour` →
 * `G4-LABOR-RATE-MISSING`.
 *
 * @param quantityGood - Quantidade boa apontada na etapa final.
 * @returns Lista com uma etapa concluida e integralmente apontada.
 */
function makeSufficientTracking(quantityGood = 10) {
  return [{
    id: 10,
    sequence: 1,
    status: 'completed',
    quantity_good: quantityGood,
    started_at: new Date('2026-08-19T08:00:00Z'),
    finished_at: new Date('2026-08-19T10:00:00Z'),
    routeStep: { id: 100, work_center_id: 5, workCenter: { id: 5, cost_per_hour: 50 } },
  }];
}

/**
 * Espalha o mesmo conjunto de apontamentos nas DUAS consultas do repositorio
 * (a travada, lida pelo gate, e a que traz o centro de trabalho, lida pelo
 * custeio) — em producao as duas leem as mesmas linhas.
 *
 * @param quantityGood - Quantidade boa apontada na etapa final.
 * @returns Trecho de repositorio dublê pronto para espalhar no mock.
 */
function trackingRepoStubs(quantityGood = 10) {
  const tracking = makeSufficientTracking(quantityGood);
  return {
    listTrackingByOrderForUpdate: jest.fn(async () => tracking),
    listTrackingWithRouteStepByOrder: jest.fn(async () => tracking),
  };
}

describe('Production Order Lifecycle (F.10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CreateProductionOrderUseCase', () => {
    it('bloqueia criacao quando BomService.checkAvailability retorna indisponibilidade', async () => {
      const productionOrderRepository = {
        findProductById: jest.fn(async () => ({ id: 1, status: 'active', product_type: 'finished', name: 'Produto A' })),
        nextOrderNumberForYear: jest.fn(async (prefix: string) => `${prefix}-0001`),
        create: jest.fn(),
      };

      BomService.checkAvailability.mockResolvedValueOnce({
        available: false,
        max_possible_quantity: 0,
        missing_items: [{ item_id: 101, missing_quantity: 5 }],
      });

      const useCase = new CreateProductionOrderUseCase(productionOrderRepository);

      await expect(
        useCase.execute({ product_id: 1, quantity: 10, due_date: '2026-08-20', created_by: 1 })
      ).rejects.toBeInstanceOf(BusinessRuleError);

      expect(productionOrderRepository.create).not.toHaveBeenCalled();
    });

    it('cria OP normalmente quando material esta disponivel', async () => {
      const productionOrderRepository = {
        findProductById: jest.fn(async () => ({ id: 1, status: 'active', product_type: 'finished', name: 'Produto A' })),
        nextOrderNumberForYear: jest.fn(async (prefix: string) => `${prefix}-0001`),
        create: jest.fn(async () => ({ id: 1, order_number: 'OP-2026-0001', status: 'planned' })),
      };

      BomService.checkAvailability.mockResolvedValueOnce({
        available: true,
        max_possible_quantity: 20,
        missing_items: [],
      });

      const useCase = new CreateProductionOrderUseCase(productionOrderRepository);
      const result = await useCase.execute({ product_id: 1, quantity: 10, due_date: '2026-08-20', created_by: 1 });

      expect(result).toBeDefined();
      expect(productionOrderRepository.create).toHaveBeenCalled();
    });

    // G16: a numeracao nao pode mais ser montada no caso de uso a partir de
    // uma contagem (`COUNT(*) + 1`, sem serializacao e regressiva apos
    // remocao de OP). Ela e delegada ao repositorio, que serializa por ano.
    it('delega a numeracao da OP ao repositorio, dentro da transacao (G16)', async () => {
      const productionOrderRepository = {
        findProductById: jest.fn(async () => ({ id: 1, status: 'active', product_type: 'finished', name: 'Produto A' })),
        nextOrderNumberForYear: jest.fn(async () => 'OP-2026-0042'),
        create: jest.fn(async (data: any) => ({ id: 1, ...data })),
      };

      BomService.checkAvailability.mockResolvedValueOnce({ available: true, max_possible_quantity: 20, missing_items: [] });

      const useCase = new CreateProductionOrderUseCase(productionOrderRepository);
      await useCase.execute({ product_id: 1, quantity: 10, due_date: '2026-08-20', created_by: 1 });

      expect(productionOrderRepository.nextOrderNumberForYear).toHaveBeenCalledWith(
        `OP-${new Date().getFullYear()}`,
        expect.objectContaining({ id: 'tx-1' }),
      );
      expect(productionOrderRepository.create.mock.calls[0][0]).toMatchObject({ order_number: 'OP-2026-0042' });
    });
  });

  describe('ChangeProductionOrderStatusUseCase', () => {
    it('bloqueia liberacao quando checkAvailability retorna indisponibilidade', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'planned',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'released' })),
      };

      BomService.checkAvailability.mockResolvedValueOnce({
        available: false,
        max_possible_quantity: 5,
        missing_items: [{ item_id: 101, missing_quantity: 3 }],
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({ id: 1, status: 'released', user_id: 1 })
      ).rejects.toMatchObject({
        constructor: BusinessRuleError,
        details: {
          production_order_id: 1,
          requested_quantity: 10,
          max_possible_quantity: 5,
          missing_items: [{ item_id: 101, missing_quantity: 3 }],
        },
      });

      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('lista TODOS os itens em falta simultaneamente (Regra 3, BUSINESS_RULES.md §13.3) — nao apenas o primeiro', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'planned',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'released' })),
      };

      BomService.checkAvailability.mockResolvedValueOnce({
        available: false,
        max_possible_quantity: 2,
        missing_items: [
          { item_id: 101, missing_quantity: 3 },
          { item_id: 102, missing_quantity: 7 },
          { item_id: 103, missing_quantity: 1 },
        ],
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      const error: any = await useCase
        .execute({ id: 1, status: 'released', user_id: 1 })
        .catch((err: any) => err);

      expect(error).toBeInstanceOf(BusinessRuleError);
      // As 3 pendencias devem aparecer juntas em uma unica resposta, nao uma de cada vez.
      expect(error.details.missing_items).toHaveLength(3);
      expect(error.details.missing_items).toEqual([
        { item_id: 101, missing_quantity: 3 },
        { item_id: 102, missing_quantity: 7 },
        { item_id: 103, missing_quantity: 1 },
      ]);
      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('reserva materiais ao liberar, vinculando cada reserva a esta OP (G3)', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        // G4: a liberacao materializa as etapas do roteiro ATIVO. Sem roteiro
        // ativo nada e criado e a liberacao segue — o bloqueio mora na conclusao.
        findActiveRouteWithStepsByProduct: jest.fn(async () => null),
        bulkCreateTracking: jest.fn(async () => []),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'planned',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'released' })),
      };

      BomService.checkAvailability.mockResolvedValueOnce({ available: true });
      BomService.explodeBOM.mockResolvedValueOnce({
        components: [
          { component_id: 101, quantity: 5 },
          { component_id: 102, quantity: 3 },
        ],
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
      await useCase.execute({ id: 1, status: 'released', user_id: 1 });

      expect(InventoryService.reserve).toHaveBeenCalledTimes(2);
      // G3: sem `productionOrderId` a reserva seria anonima de novo — e o
      // proprio inventoryService recusa (400).
      for (const call of InventoryService.reserve.mock.calls) {
        expect(call[4]).toMatchObject({ productionOrderId: 1 });
      }
    });

    it('libera reservas ao cancelar OP em status released/in_progress/paused', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'released',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'canceled' })),
      };

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
      await useCase.execute({ id: 1, status: 'canceled', user_id: 1 });

      // G3: o cancelamento nao reexplode mais a BOM (que pode ter mudado
      // desde a liberacao) nem mexe no contador global — devolve exatamente
      // o que ESTA OP reservou.
      expect(BomService.explodeBOM).not.toHaveBeenCalled();
      expect(InventoryService.releaseAllReservationsForOrder).toHaveBeenCalledWith(
        1,
        1,
        expect.anything(),
        expect.objectContaining({ referenceId: 1, referenceType: 'production' }),
      );
    });

    it('exige lot_consumptions explicitos ao concluir OP com componentes', async () => {
      const productionOrderRepository = {
        ...trackingRepoStubs(),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          // Sem `due_date` este mock estourava ValidationError ja no construtor da
          // entidade, e o teste passava sem nunca exercitar a regra de
          // rastreabilidade que ele promete cobrir (verde pelo motivo errado).
          due_date: new Date('2026-08-20'),
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'completed' })),
      };

      BomService.explodeBOM.mockResolvedValueOnce({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 100,
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({
          id: 1,
          status: 'completed',
          quantity_produced: 10,
          user_id: 1,
          lot_consumptions: undefined,
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('conclui OP com lot_consumptions validos sem erro de rastreabilidade', async () => {
      jest.clearAllMocks(); // Clear mocks from previous tests

      const productionOrderRepository = {
        ...trackingRepoStubs(),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'completed' })),
        findProductById: jest.fn(async () => ({ id: 101, reserved_quantity: 5 })),
      };

      BomService.explodeBOM.mockResolvedValue({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 100,
      });

      LotControl.findOne.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-2026-001',
        status: 'available',
        expires_at: null,
        quantity_available: 10,
        update: jest.fn(async () => ({})),
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      // Change status diretamente para completed do in_progress sem passar por released
      await useCase.execute({
        id: 1,
        status: 'completed',
        quantity_produced: 10,
        user_id: 1,
        lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
        finished_lot_number: 'LOT-FINISHED-001',
      });

      expect(productionOrderRepository.update).toHaveBeenCalled();
      expect(LotControl.create).toHaveBeenCalled();
    });

    // G3: a conclusao libera a reserva DESTA OP antes de consumir. Antes de
    // 2026-08-09 ela reexplodia a BOM e chamava a liberacao sobre o contador
    // global do produto (`MIN(reserved_quantity, desejado)`) — o que devolvia
    // ao estoque livre material que pertencia a outra ordem.
    it('conclusao libera a reserva vinculada a esta OP (e nao o contador global do produto)', async () => {
      jest.clearAllMocks();

      const productionOrderRepository = {
        ...trackingRepoStubs(),
        findByIdForUpdate: jest.fn(async () => ({
          id: 42,
          status: 'in_progress',
          order_number: 'OP-2026-0042',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({ id: 42, status: 'completed' })),
      };

      BomService.explodeBOM.mockResolvedValue({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 100,
      });

      LotControl.findOne.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-2026-001',
        status: 'available',
        expires_at: null,
        quantity_available: 10,
        update: jest.fn(async () => ({})),
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
      await useCase.execute({
        id: 42,
        status: 'completed',
        quantity_produced: 10,
        user_id: 3,
        lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
      });

      expect(InventoryService.releaseAllReservationsForOrder).toHaveBeenCalledWith(
        42,
        3,
        expect.anything(),
        expect.objectContaining({ referenceId: 42, referenceType: 'production' }),
      );
      // A liberacao acontece ANTES do consumo — senao o proprio material
      // reservado pela OP bloquearia o consumo dela mesma.
      const releaseOrder = InventoryService.releaseAllReservationsForOrder.mock.invocationCallOrder[0];
      const consumeOrder = InventoryService.consume.mock.invocationCallOrder[0];
      expect(releaseOrder).toBeLessThan(consumeOrder);
    });

    it('conclui OP registrando quantity_scrapped e scrap_reason sem afetar estoque de insumos', async () => {
      jest.clearAllMocks();

      const productionOrderRepository = {
        // Etapa final apontou 7 boas — o mesmo `quantity_produced` da conclusao.
        ...trackingRepoStubs(7),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(async () => ({
          id: 1,
          status: 'completed',
          quantity_produced: 7,
          quantity_scrapped: 3,
          scrap_reason: 'Falha de solda',
        })),
        findProductById: jest.fn(async () => ({ id: 101, reserved_quantity: 5 })),
      };

      BomService.explodeBOM.mockResolvedValue({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 100,
      });

      LotControl.findOne.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-2026-001',
        status: 'available',
        expires_at: null,
        quantity_available: 10,
        update: jest.fn(async () => ({})),
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      const result = await useCase.execute({
        id: 1,
        status: 'completed',
        quantity_produced: 7,
        quantity_scrapped: 3,
        scrap_reason: 'Falha de solda',
        user_id: 1,
        lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
        finished_lot_number: 'LOT-FINISHED-001',
      });

      expect(productionOrderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ quantity_produced: 7, quantity_scrapped: 3, scrap_reason: 'Falha de solda' }),
        expect.anything()
      );
      // Recebimento de estoque usa apenas a quantidade PRODUZIDA boa, nunca o total com refugo.
      expect(InventoryService.receive).toHaveBeenCalledWith(1, 7, 1, expect.anything(), expect.any(Object));
      expect(result.updateData.quantity_scrapped).toBe(3);
    });

    it('bloqueia conclusao quando quantity_produced + quantity_scrapped excede o planejado sem allow_overproduction', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(),
      };

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({
          id: 1,
          status: 'completed',
          quantity_produced: 9,
          quantity_scrapped: 5,
          user_id: 1,
        })
      ).rejects.toBeInstanceOf(ValidationError);

      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('bloqueia conclusao quando ha etapa de apontamento em aberto (reconciliacao 1.3)', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => [
          { id: 1, sequence: 1, status: 'completed', quantity_good: 10 },
          { id: 2, sequence: 2, status: 'in_progress', quantity_good: 0 },
        ]),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(),
      };

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 })
      ).rejects.toMatchObject({
        constructor: BusinessRuleError,
        details: {
          rule: 'G4-TRACKING-STEP-OPEN',
          open_steps: [{ id: 2, sequence: 2, status: 'in_progress' }],
        },
      });

      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('lista TODAS as etapas em aberto simultaneamente (Regra 3, BUSINESS_RULES.md §13.3) — nao apenas a primeira', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => [
          { id: 1, sequence: 1, status: 'pending', quantity_good: 0 },
          { id: 2, sequence: 2, status: 'in_progress', quantity_good: 0 },
          { id: 3, sequence: 3, status: 'paused', quantity_good: 0 },
          { id: 4, sequence: 4, status: 'completed', quantity_good: 10 },
        ]),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(),
      };

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      const error: any = await useCase
        .execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 })
        .catch((err: any) => err);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error.details.rule).toBe('G4-TRACKING-STEP-OPEN');
      // As 3 etapas em aberto (pending/in_progress/paused) devem aparecer juntas, a etapa completed fica de fora.
      expect(error.details.open_steps).toHaveLength(3);
      expect(error.details.open_steps).toEqual([
        { id: 1, sequence: 1, status: 'pending' },
        { id: 2, sequence: 2, status: 'in_progress' },
        { id: 3, sequence: 3, status: 'paused' },
      ]);
      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('bloqueia conclusao quando quantity_produced excede o apontado na ultima etapa (reconciliacao 1.3)', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => [
          { id: 1, sequence: 1, status: 'completed', quantity_good: 10 },
          { id: 2, sequence: 2, status: 'completed', quantity_good: 8 },
        ]),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(),
      };

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 })
      ).rejects.toMatchObject({
        constructor: BusinessRuleError,
        details: {
          rule: 'G4-TRACKING-QTY-EXCEEDS',
          last_step_sequence: 2,
          last_step_quantity_good: 8,
          quantity_produced: 10,
        },
      });

      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('rejeita consumo manual de lote vencido (achado de auditoria: FEFO/expires_at)', async () => {
      jest.clearAllMocks();

      const productionOrderRepository = {
        ...trackingRepoStubs(),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(),
        findProductById: jest.fn(async () => ({ id: 101, reserved_quantity: 5 })),
      };

      BomService.explodeBOM.mockResolvedValue({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 100,
      });

      LotControl.findOne.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-VENCIDO-001',
        status: 'available',
        expires_at: '2020-01-01', // vencido
        quantity_available: 10,
        update: jest.fn(async () => ({})),
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({
          id: 1,
          status: 'completed',
          quantity_produced: 10,
          user_id: 1,
          lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
          finished_lot_number: 'LOT-FINISHED-001',
        })
      ).rejects.toBeInstanceOf(BusinessRuleError);

      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });

    it('rejeita consumo manual de lote bloqueado/nao disponivel', async () => {
      jest.clearAllMocks();

      const productionOrderRepository = {
        ...trackingRepoStubs(),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
          due_date: new Date('2026-08-20'),
          get: function() { return this; }
        })),
        update: jest.fn(),
        findByIdWithProductSummary: jest.fn(),
        findProductById: jest.fn(async () => ({ id: 101, reserved_quantity: 5 })),
      };

      BomService.explodeBOM.mockResolvedValue({
        components: [{ component_id: 101, quantity: 5 }],
        total_cost: 100,
      });

      LotControl.findOne.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-BLOQUEADO-001',
        status: 'blocked',
        expires_at: null,
        quantity_available: 10,
        update: jest.fn(async () => ({})),
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);

      await expect(
        useCase.execute({
          id: 1,
          status: 'completed',
          quantity_produced: 10,
          user_id: 1,
          lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
          finished_lot_number: 'LOT-FINISHED-001',
        })
      ).rejects.toBeInstanceOf(BusinessRuleError);

      expect(productionOrderRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('CompleteProductionTrackingUseCase', () => {
    it('rejeita quantidades negativas', async () => {
      const productionOrderRepository = {
        findTrackingByIdForUpdate: jest.fn(),
        updateTracking: jest.fn(),
      };

      const useCase = new CompleteProductionTrackingUseCase(productionOrderRepository);

      await expect(
        useCase.execute({ tracking_id: 1, quantity_good: -1, quantity_scrapped: 0 })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejeita conclusao de tracking nao em in_progress', async () => {
      const productionOrderRepository = {
        findTrackingByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'completed' })),
        updateTracking: jest.fn(),
      };

      const useCase = new CompleteProductionTrackingUseCase(productionOrderRepository);

      await expect(
        useCase.execute({ tracking_id: 1, quantity_good: 10, quantity_scrapped: 0 })
      ).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('conclui tracking com sucesso atualizando status para completed', async () => {
      const productionOrderRepository = {
        findTrackingByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'in_progress' })),
        updateTracking: jest.fn(async () => ({})),
        findTrackingById: jest.fn(async () => ({ id: 1, status: 'completed', quantity_good: 10, quantity_scrapped: 0 })),
      };

      const useCase = new CompleteProductionTrackingUseCase(productionOrderRepository);
      const result = await useCase.execute({ tracking_id: 1, quantity_good: 10, quantity_scrapped: 0 });

      expect(productionOrderRepository.updateTracking).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'completed',
          quantity_good: 10,
          quantity_scrapped: 0,
        }),
        expect.any(Object)
      );

      expect(result).toBeDefined();
    });
  });

  describe('Conclusao de OP — gap G2 (produto entrando em estoque com custo zero)', () => {
    // `due_date` e obrigatorio na validacao da entidade (ProductionOrderEntity.validate).
    // Sem ele o construtor estoura ValidationError e o teste nunca chega na regra
    // que pretende exercitar — cuidado ao copiar mocks de OP daqui.
    // O apontamento suficiente (G4) e OBRIGATORIO nestes mocks: sem ele o gate
    // do G4 reprovaria a conclusao antes de a explosao de BOM ser tentada, e os
    // testes abaixo ficariam verdes provando a regra ERRADA. Por isso cada um
    // afirma `details.rule === 'G2'` explicitamente.
    const makeRepo = () => ({
      ...trackingRepoStubs(),
      findByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'in_progress',
        order_number: 'OP-2026-0001',
        product_id: 1,
        quantity: 10,
        quantity_produced: 0,
        due_date: '2026-12-31',
      })),
      update: jest.fn(),
      findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'completed' })),
    });

    it('bloqueia conclusao quando o produto nao tem BOM ativa, em vez de entrar com custo zero', async () => {
      const repo = makeRepo();
      const bomNotFound: any = new Error('BOM ativa nao encontrada');
      bomNotFound.statusCode = 404;
      BomService.explodeBOM.mockRejectedValueOnce(bomNotFound);

      await expect(
        new ChangeProductionOrderStatusUseCase(repo).execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 })
      ).rejects.toMatchObject({ constructor: BusinessRuleError, details: { rule: 'G2' } });

      // Nada pode ter entrado em estoque nem sido custeado, e a OP nao pode ter sido marcada concluida.
      expect(InventoryService.receive).not.toHaveBeenCalled();
      expect(CostingService.registerWeightedAverageCost).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('propaga erro de BOM que nao seja 404 sem transformar em regra de negocio', async () => {
      const repo = makeRepo();
      const bomBoom: any = new Error('falha inesperada na explosao');
      bomBoom.statusCode = 500;
      BomService.explodeBOM.mockRejectedValueOnce(bomBoom);

      await expect(
        new ChangeProductionOrderStatusUseCase(repo).execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 })
      ).rejects.toThrow('falha inesperada na explosao');
      expect(InventoryService.receive).not.toHaveBeenCalled();
    });

    it('bloqueia conclusao com quantidade produzida zero (deixaria a reserva de material presa)', async () => {
      const repo = makeRepo();

      await expect(
        new ChangeProductionOrderStatusUseCase(repo).execute({ id: 1, status: 'completed', quantity_produced: 0, user_id: 1 })
      ).rejects.toMatchObject({ constructor: BusinessRuleError, details: { rule: 'G2' } });

      expect(InventoryService.receive).not.toHaveBeenCalled();
      expect(InventoryService.releaseReservation).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
