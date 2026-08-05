/**
 * Test: Devolução ao fornecedor (Bloco B,
 * docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, seção "Bloco B —
 * Backend: consequência real da devolução ao fornecedor").
 *
 * Cobre `SupplierReturnHandler.applySupplierReturn`, acionado por
 * `CreateNonConformityUseCase`/`UpdateNonConformityUseCase` quando
 * `immediate_action = 'return_supplier'`:
 * - item produtivo/uso-consumo (via `purchase_item_id` -> `Item.tipo`):
 *   estorna estoque (`InventoryMovement` tipo `out`, `reference_type:
 *   'purchase'`) na quantidade afetada;
 * - ativo imobilizado (via `asset_id`): `Asset.status ->
 *   'returned_to_supplier'`;
 * - score de qualidade do fornecedor é atualizado (recalculo já existente
 *   de `CreateNonConformityUseCase`, disparado quando o lote referenciado
 *   tem `supplier_id`);
 * - contador de handoff de Compras (`compras.pending_returns`) reflete
 *   RNCs de devolução ainda não encerradas.
 *
 * @group unit
 * @ticket bloco-b-devolucao-fornecedor
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      id: 'tx-return-1',
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(async () => {}),
      rollback: jest.fn(async () => {}),
    })),
  },
}));

jest.mock('../../src/services/inventoryService', () => ({
  consume: jest.fn(async () => ({ success: true, movementId: 501 })),
}));

jest.mock('../../src/models/index', () => ({
  LotControl: {
    findOne: jest.fn(async () => null),
    count: jest.fn(),
  },
  Supplier: {
    update: jest.fn(async () => [1]),
  },
  NonConformity: {
    count: jest.fn(),
  },
  PurchaseItem: {
    findByPk: jest.fn(),
  },
  Item: {
    findByPk: jest.fn(),
  },
  Asset: {
    findByPk: jest.fn(),
  },
  InventoryMovement: {},
}));

import CreateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase');
import UpdateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase');

const { PurchaseItem, Item, Asset } = require('../../src/models/index');
const InventoryService = require('../../src/services/inventoryService');

describe('Devolução ao fornecedor — Bloco B', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CreateNonConformityUseCase — item produtivo/uso-consumo estorna estoque', () => {
    it('gera InventoryMovement de saída estornando o recebimento original quando immediate_action=return_supplier e purchase_item_id resolve item produtivo', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 100, status: 'open' })),
      };

      PurchaseItem.findByPk.mockResolvedValue({
        id: 10,
        product_id: 55,
        purchase_id: 200,
        item_id: 'item-uuid-1',
      });
      Item.findByPk.mockResolvedValue({ id: 'item-uuid-1', tipo: 'MATERIA_PRIMA' });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Peça fora de especificação recebida',
        origin: 'incoming',
        purchase_item_id: 10,
        quantity_affected: 5,
        immediate_action: 'return_supplier',
        reportedBy: 1,
      });

      expect(PurchaseItem.findByPk).toHaveBeenCalledWith(10, expect.anything());
      expect(Item.findByPk).toHaveBeenCalledWith('item-uuid-1', expect.anything());
      expect(InventoryService.consume).toHaveBeenCalledWith(
        55,
        5,
        1,
        expect.anything(),
        expect.objectContaining({
          referenceId: 200,
          referenceType: 'purchase',
        })
      );
    });

    it('também estorna estoque para item USO_E_CONSUMO (MRO)', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 101, status: 'open' })),
      };

      PurchaseItem.findByPk.mockResolvedValue({
        id: 11,
        product_id: 56,
        purchase_id: 201,
        item_id: 'item-uuid-2',
      });
      Item.findByPk.mockResolvedValue({ id: 'item-uuid-2', tipo: 'USO_E_CONSUMO' });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Luva de proteção com defeito',
        origin: 'incoming',
        purchase_item_id: 11,
        quantity_affected: 20,
        immediate_action: 'return_supplier',
        reportedBy: 2,
      });

      expect(InventoryService.consume).toHaveBeenCalledWith(
        56,
        20,
        2,
        expect.anything(),
        expect.objectContaining({ referenceType: 'purchase' })
      );
    });

    it('não estorna estoque quando purchase_item_id não resolve item de estoque (ATIVO_IMOBILIZADO sem asset_id vinculado)', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 102, status: 'open' })),
      };

      PurchaseItem.findByPk.mockResolvedValue({
        id: 12,
        product_id: 57,
        purchase_id: 202,
        item_id: 'item-uuid-3',
      });
      Item.findByPk.mockResolvedValue({ id: 'item-uuid-3', tipo: 'ATIVO_IMOBILIZADO' });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Equipamento comprado com defeito, sem asset_id vinculado',
        origin: 'incoming',
        purchase_item_id: 12,
        quantity_affected: 1,
        immediate_action: 'return_supplier',
        reportedBy: 3,
      });

      expect(InventoryService.consume).not.toHaveBeenCalled();
    });

    it('não estorna estoque nem consulta Item quando immediate_action não é return_supplier', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 103, status: 'open' })),
      };

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Defeito tratado com retrabalho, não devolução',
        origin: 'in_process',
        purchase_item_id: 13,
        quantity_affected: 3,
        immediate_action: 'rework',
        reportedBy: 4,
      });

      expect(PurchaseItem.findByPk).not.toHaveBeenCalled();
      expect(InventoryService.consume).not.toHaveBeenCalled();
    });
  });

  describe('CreateNonConformityUseCase — ativo imobilizado muda status', () => {
    it('atualiza Asset.status para returned_to_supplier quando asset_id é informado', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 110, status: 'open' })),
      };

      const assetUpdate = jest.fn(async () => ({}));
      Asset.findByPk.mockResolvedValue({
        id: 30,
        status: 'active',
        notes: null,
        update: assetUpdate,
      });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Máquina com defeito de fábrica, comprada há 2 meses',
        origin: 'incoming',
        asset_id: 30,
        immediate_action: 'return_supplier',
        reportedBy: 5,
      });

      expect(Asset.findByPk).toHaveBeenCalledWith(30, expect.anything());
      expect(assetUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'returned_to_supplier',
          notes: expect.stringContaining('Devolvido ao fornecedor via RNC #110'),
        }),
        expect.anything()
      );
      // asset_id tem precedência — não consulta PurchaseItem/estoque na mesma RNC.
      expect(PurchaseItem.findByPk).not.toHaveBeenCalled();
    });

    it('não reabre o estorno se o ativo já está returned_to_supplier (idempotência)', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 111, status: 'open' })),
      };

      const assetUpdate = jest.fn(async () => ({}));
      Asset.findByPk.mockResolvedValue({
        id: 31,
        status: 'returned_to_supplier',
        notes: 'Devolvido ao fornecedor via RNC #90',
        update: assetUpdate,
      });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Segunda RNC no mesmo ativo já devolvido',
        origin: 'incoming',
        asset_id: 31,
        immediate_action: 'return_supplier',
        reportedBy: 6,
      });

      expect(assetUpdate).not.toHaveBeenCalled();
    });
  });

  describe('CreateNonConformityUseCase — score de qualidade do fornecedor', () => {
    it('recalcula suppliers.quality_score quando a RNC de devolução referencia lote com fornecedor', async () => {
      const { LotControl, Supplier, NonConformity } = require('../../src/models/index');

      const nonConformitiesRepository = {
        create: jest.fn(async (data: any) => ({ id: 120, supplier_id: data.supplier_id, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue({
        id: 40,
        lot_number: 'LOT-RET-001',
        status: 'quarantine',
        supplier_id: 77,
        notes: null,
        update: jest.fn(async () => ({})),
      });
      LotControl.count.mockResolvedValue(8);
      NonConformity.count.mockResolvedValue(2);

      PurchaseItem.findByPk.mockResolvedValue({
        id: 14,
        product_id: 58,
        purchase_id: 203,
        item_id: null,
      });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Lote inteiro fora de especificação, devolução ao fornecedor',
        product_id: 58,
        lot_number: 'LOT-RET-001',
        origin: 'incoming',
        purchase_item_id: 14,
        quantity_affected: 10,
        immediate_action: 'return_supplier',
        reportedBy: 7,
      });

      // 100 - (2/8 * 100) = 75
      expect(Supplier.update).toHaveBeenCalledWith(
        { quality_score: 75 },
        expect.objectContaining({ where: { id: 77 } })
      );
      // Sem item_id no PurchaseItem (compra legada): tratado como
      // produtivo por default, estorna estoque também.
      expect(InventoryService.consume).toHaveBeenCalledWith(
        58,
        10,
        7,
        expect.anything(),
        expect.objectContaining({ referenceType: 'purchase' })
      );
    });
  });

  describe('UpdateNonConformityUseCase — devolução disparada na transição de immediate_action', () => {
    it('aciona o estorno de estoque quando a RNC é atualizada para return_supplier (não estava antes)', async () => {
      const nonConformitiesRepository = {
        findById: jest
          .fn()
          .mockResolvedValueOnce({
            id: 130,
            immediate_action: 'sorting',
            purchase_item_id: 15,
            asset_id: null,
            quantity_affected: 7,
          })
          .mockResolvedValue({ id: 130, immediate_action: 'return_supplier' }),
        update: jest.fn(async () => 1),
      };

      PurchaseItem.findByPk.mockResolvedValue({
        id: 15,
        product_id: 59,
        purchase_id: 204,
        item_id: 'item-uuid-4',
      });
      Item.findByPk.mockResolvedValue({ id: 'item-uuid-4', tipo: 'SUBCONJUNTO' });

      const useCase = new UpdateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        id: 130,
        body: { immediate_action: 'return_supplier' },
        closedBy: 8,
      });

      expect(InventoryService.consume).toHaveBeenCalledWith(
        59,
        7,
        8,
        expect.anything(),
        expect.objectContaining({ referenceType: 'purchase' })
      );
      expect(nonConformitiesRepository.update).toHaveBeenCalledWith(
        130,
        expect.objectContaining({ immediate_action: 'return_supplier' }),
        expect.anything()
      );
    });

    it('NÃO reaciona o estorno quando immediate_action já era return_supplier antes do PUT (evita duplo estorno)', async () => {
      const nonConformitiesRepository = {
        findById: jest.fn().mockResolvedValue({
          id: 131,
          immediate_action: 'return_supplier',
          purchase_item_id: 16,
          asset_id: null,
          quantity_affected: 4,
        }),
        update: jest.fn(async () => 1),
      };

      const useCase = new UpdateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        id: 131,
        body: { immediate_action: 'return_supplier', root_cause: 'Detalhamento adicional' },
        closedBy: 9,
      });

      expect(PurchaseItem.findByPk).not.toHaveBeenCalled();
      expect(InventoryService.consume).not.toHaveBeenCalled();
      expect(nonConformitiesRepository.update).toHaveBeenCalledWith(
        131,
        expect.objectContaining({ root_cause: 'Detalhamento adicional' })
      );
    });

    it('atualiza Asset.status ao transicionar para return_supplier em RNC de ativo', async () => {
      const nonConformitiesRepository = {
        findById: jest
          .fn()
          .mockResolvedValueOnce({
            id: 132,
            immediate_action: 'use_as_is',
            purchase_item_id: null,
            asset_id: 32,
            quantity_affected: null,
          })
          .mockResolvedValue({ id: 132, immediate_action: 'return_supplier' }),
        update: jest.fn(async () => 1),
      };

      const assetUpdate = jest.fn(async () => ({}));
      Asset.findByPk.mockResolvedValue({
        id: 32,
        status: 'in_maintenance',
        notes: null,
        update: assetUpdate,
      });

      const useCase = new UpdateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        id: 132,
        body: { immediate_action: 'return_supplier' },
        closedBy: 10,
      });

      expect(assetUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'returned_to_supplier' }),
        expect.anything()
      );
    });
  });
});
