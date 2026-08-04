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

jest.mock('../../src/services/inventoryService', () => ({
  reserve: jest.fn(async () => ({})),
  consume: jest.fn(async () => ({})),
  receive: jest.fn(async () => ({ product: { id: 1, name: 'Test Product', quantity: 10 } })),
  releaseReservation: jest.fn(async () => ({})),
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

describe('Production Order Lifecycle (F.10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CreateProductionOrderUseCase', () => {
    it('bloqueia criacao quando BomService.checkAvailability retorna indisponibilidade', async () => {
      const productionOrderRepository = {
        findProductById: jest.fn(async () => ({ id: 1, status: 'active', product_type: 'finished', name: 'Produto A' })),
        countByOrderNumberPrefix: jest.fn(async () => 0),
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
        countByOrderNumberPrefix: jest.fn(async () => 0),
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

    it('reserva materiais ao liberar com disponibilidade confirmada', async () => {
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
        findProductById: jest.fn(async () => ({ id: 101, reserved_quantity: 5 })),
      };

      BomService.explodeBOM.mockResolvedValueOnce({
        components: [{ component_id: 101, quantity: 5 }],
      });

      const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
      await useCase.execute({ id: 1, status: 'canceled', user_id: 1 });

      expect(InventoryService.releaseReservation).toHaveBeenCalled();
    });

    it('exige lot_consumptions explicitos ao concluir OP com componentes', async () => {
      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        findByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'in_progress',
          order_number: 'OP-2026-0001',
          product_id: 1,
          quantity: 10,
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
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        listTrackingWithRouteStepByOrder: jest.fn(async () => []),
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

    it('conclui OP registrando quantity_scrapped e scrap_reason sem afetar estoque de insumos', async () => {
      jest.clearAllMocks();

      const productionOrderRepository = {
        listTrackingByOrderForUpdate: jest.fn(async () => []),
        listTrackingWithRouteStepByOrder: jest.fn(async () => []),
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
          open_steps: [{ id: 2, sequence: 2, status: 'in_progress' }],
        },
      });

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
});
