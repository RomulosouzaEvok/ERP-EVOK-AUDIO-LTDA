/**
 * Test: Quality Lot Lifecycle (item 8 do levantamento — qualidade fecha o loop)
 *
 * Cobre o ciclo de vida de quarentena/bloqueio/liberacao de lotes
 * (`LotControl`):
 * - Recebimento de compra cria lotes em `quarantine` (nao mais `available`);
 * - `ReleaseLotUseCase`: transicoes validas (`quarantine`/`blocked` ->
 *   `available`) e invalidas;
 * - `BlockLotUseCase`: transicoes validas (`quarantine`/`available` ->
 *   `blocked`) e invalidas, com `reason` obrigatorio;
 * - `CreateNonConformityUseCase`: bloqueia o lote referenciado na MESMA
 *   transacao da criacao da RNC e, quando o lote tem `supplier_id`,
 *   recalcula `suppliers.quality_score` (realimentacao de rating,
 *   pendencia do item 8 fechada nesta entrega).
 *
 * @group unit
 * @ticket item-8-qualidade-fecha-loop
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      id: 'tx-quality-1',
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(async () => {}),
      rollback: jest.fn(async () => {}),
    })),
  },
}));

jest.mock('../../src/models/index', () => ({
  LotControl: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  },
  Supplier: {
    update: jest.fn(async () => [1]),
  },
  NonConformity: {
    count: jest.fn(),
  },
}));

import ReleaseLotUseCase = require('../../src/modules/inventory/application/use-cases/ReleaseLotUseCase');
import BlockLotUseCase = require('../../src/modules/inventory/application/use-cases/BlockLotUseCase');
import CreateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase');
import { ValidationError, NotFoundError, BusinessRuleError } from '../../src/errors';

const { sequelize } = require('../../src/config/database');
const { LotControl, Supplier, NonConformity } = require('../../src/models/index');

describe('Quality Lot Lifecycle (item 8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ReleaseLotUseCase', () => {
    it('libera lote em quarantine para available', async () => {
      const update = jest.fn(async () => ({}));
      LotControl.findByPk.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-001',
        status: 'quarantine',
        notes: null,
        update,
      });

      const useCase = new ReleaseLotUseCase();
      await useCase.execute({ id: 1, notes: 'Inspecao aprovada' });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'available' })
      );
    });

    it('libera lote em blocked para available (pos-tratativa de RNC)', async () => {
      const update = jest.fn(async () => ({}));
      LotControl.findByPk.mockResolvedValue({
        id: 2,
        lot_number: 'LOT-002',
        status: 'blocked',
        notes: 'Bloqueado pela RNC #10',
        update,
      });

      const useCase = new ReleaseLotUseCase();
      await useCase.execute({ id: 2 });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'available' })
      );
    });

    it('rejeita liberacao de lote ja available (transicao invalida)', async () => {
      LotControl.findByPk.mockResolvedValue({
        id: 3,
        lot_number: 'LOT-003',
        status: 'available',
        notes: null,
        update: jest.fn(),
      });

      const useCase = new ReleaseLotUseCase();

      await expect(useCase.execute({ id: 3 })).rejects.toMatchObject({
        constructor: BusinessRuleError,
        details: {
          lot_id: 3,
          current_status: 'available',
          allowed_statuses: ['quarantine', 'blocked'],
        },
      });
    });

    it('lanca NotFoundError quando lote nao existe', async () => {
      LotControl.findByPk.mockResolvedValue(null);

      const useCase = new ReleaseLotUseCase();

      await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('BlockLotUseCase', () => {
    it('bloqueia lote em quarantine com reason valido', async () => {
      const update = jest.fn(async () => ({}));
      LotControl.findByPk.mockResolvedValue({
        id: 1,
        lot_number: 'LOT-001',
        status: 'quarantine',
        notes: null,
        update,
      });

      const useCase = new BlockLotUseCase();
      await useCase.execute({ id: 1, reason: 'Defeito visual detectado na inspecao' });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'blocked' })
      );
    });

    it('bloqueia lote available com reason valido', async () => {
      const update = jest.fn(async () => ({}));
      LotControl.findByPk.mockResolvedValue({
        id: 4,
        lot_number: 'LOT-004',
        status: 'available',
        notes: null,
        update,
      });

      const useCase = new BlockLotUseCase();
      await useCase.execute({ id: 4, reason: 'RNC aberta' });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'blocked' })
      );
    });

    it('rejeita bloqueio sem reason (ou reason curto demais)', async () => {
      const useCase = new BlockLotUseCase();

      await expect(useCase.execute({ id: 1, reason: '' })).rejects.toBeInstanceOf(ValidationError);
      await expect(useCase.execute({ id: 1, reason: 'ab' })).rejects.toBeInstanceOf(ValidationError);
      expect(LotControl.findByPk).not.toHaveBeenCalled();
    });

    it('rejeita bloqueio de lote ja consumido (transicao invalida)', async () => {
      LotControl.findByPk.mockResolvedValue({
        id: 5,
        lot_number: 'LOT-005',
        status: 'consumed',
        notes: null,
        update: jest.fn(),
      });

      const useCase = new BlockLotUseCase();

      await expect(
        useCase.execute({ id: 5, reason: 'Motivo valido' })
      ).rejects.toMatchObject({
        constructor: BusinessRuleError,
        details: {
          lot_id: 5,
          current_status: 'consumed',
          allowed_statuses: ['quarantine', 'available'],
        },
      });
    });

    it('lanca NotFoundError quando lote nao existe', async () => {
      LotControl.findByPk.mockResolvedValue(null);

      const useCase = new BlockLotUseCase();

      await expect(
        useCase.execute({ id: 999, reason: 'Motivo valido' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('CreateNonConformityUseCase — bloqueio de lote na mesma transacao', () => {
    it('bloqueia o lote referenciado (available -> blocked) na mesma transacao da RNC', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 42, description: 'Defeito', status: 'open' })),
      };

      const lotUpdate = jest.fn(async () => ({}));
      LotControl.findOne.mockResolvedValue({
        id: 7,
        lot_number: 'LOT-007',
        status: 'available',
        notes: null,
        update: lotUpdate,
      });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      const result = await useCase.execute({
        description: 'Defeito visual no produto acabado',
        product_id: 55,
        lot_number: 'LOT-007',
        reportedBy: 1,
      });

      expect(nonConformitiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Defeito visual no produto acabado' }),
        expect.anything()
      );
      expect(LotControl.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { product_id: 55, lot_number: 'LOT-007' } })
      );
      expect(lotUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'blocked',
          notes: expect.stringContaining('Bloqueado pela RNC #42'),
        }),
        expect.anything()
      );
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(42);
    });

    it('bloqueia lote em quarantine referenciado pela RNC', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 43, status: 'open' })),
      };

      const lotUpdate = jest.fn(async () => ({}));
      LotControl.findOne.mockResolvedValue({
        id: 8,
        lot_number: 'LOT-008',
        status: 'quarantine',
        notes: 'Recebimento PO 100',
        update: lotUpdate,
      });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'Material fora de especificacao no recebimento',
        product_id: 60,
        lot_number: 'LOT-008',
        origin: 'incoming',
        reportedBy: 2,
      });

      expect(lotUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'blocked' }),
        expect.anything()
      );
    });

    it('cria a RNC normalmente sem erro quando o lote referenciado nao e encontrado', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 44, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue(null);

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      const result = await useCase.execute({
        description: 'RNC referenciando lote de sistema externo',
        product_id: 70,
        lot_number: 'LOTE-EXTERNO-999',
        reportedBy: 3,
      });

      expect(result.id).toBe(44);
      expect(nonConformitiesRepository.create).toHaveBeenCalledTimes(1);
    });

    it('nao bloqueia lote quando payload nao informa lot_number', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 45, status: 'open' })),
      };

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await useCase.execute({
        description: 'RNC sem referencia de lote',
        product_id: 80,
        reportedBy: 4,
      });

      expect(LotControl.findOne).not.toHaveBeenCalled();
    });

    it('rejeita criacao sem description antes de abrir transacao', async () => {
      const nonConformitiesRepository = { create: jest.fn() };
      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);

      await expect(useCase.execute({ reportedBy: 1 })).rejects.toBeInstanceOf(ValidationError);
      expect(nonConformitiesRepository.create).not.toHaveBeenCalled();
      expect(sequelize.transaction).not.toHaveBeenCalled();
    });
  });

  describe('CreateNonConformityUseCase — realimentacao de quality_score do fornecedor (item 8)', () => {
    it('RNC referenciando lote de fornecedor X reduz o quality_score de X corretamente', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async (data: any) => ({ id: 50, supplier_id: data.supplier_id, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue({
        id: 9,
        lot_number: 'LOT-009',
        status: 'available',
        supplier_id: 77,
        notes: null,
        update: jest.fn(async () => ({})),
      });
      // 10 recebimentos historicos do fornecedor 77, e esta e a 3a RNC dele
      // (as 2 anteriores + a que acabou de ser criada na mesma transacao,
      // ja contabilizada porque a RNC e criada ANTES do recalculo).
      LotControl.count.mockResolvedValue(10);
      NonConformity.count.mockResolvedValue(3);

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);
      await useCase.execute({
        description: 'Defeito dimensional em insumo recebido',
        product_id: 90,
        lot_number: 'LOT-009',
        origin: 'incoming',
        reportedBy: 5,
      });

      expect(LotControl.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { supplier_id: 77 } })
      );
      expect(NonConformity.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { supplier_id: 77 } })
      );
      // 100 - (3/10 * 100) = 70
      expect(Supplier.update).toHaveBeenCalledWith(
        { quality_score: 70 },
        expect.objectContaining({ where: { id: 77 } })
      );
    });

    it('nunca deixa o quality_score negativo (floor em 0) quando rncs_count > receipts_count', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async (data: any) => ({ id: 51, supplier_id: data.supplier_id, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue({
        id: 10,
        lot_number: 'LOT-010',
        status: 'available',
        supplier_id: 88,
        notes: null,
        update: jest.fn(async () => ({})),
      });
      LotControl.count.mockResolvedValue(2);
      NonConformity.count.mockResolvedValue(5);

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);
      await useCase.execute({
        description: 'Lote critico com historico ruim de RNCs',
        product_id: 91,
        lot_number: 'LOT-010',
        reportedBy: 6,
      });

      expect(Supplier.update).toHaveBeenCalledWith(
        { quality_score: 0 },
        expect.objectContaining({ where: { id: 88 } })
      );
    });

    it('nao recalcula nem afeta rating de ninguem quando a RNC nao referencia lote', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async () => ({ id: 52, status: 'open' })),
      };

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);
      await useCase.execute({
        description: 'RNC de auditoria sem referencia de lote',
        product_id: 92,
        reportedBy: 7,
      });

      expect(LotControl.count).not.toHaveBeenCalled();
      expect(NonConformity.count).not.toHaveBeenCalled();
      expect(Supplier.update).not.toHaveBeenCalled();
    });

    it('nao recalcula quando o lote referenciado nao tem fornecedor (ex.: lote de producao interna)', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async (data: any) => ({ id: 53, supplier_id: data.supplier_id, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue({
        id: 11,
        lot_number: 'LOT-INTERNO-001',
        status: 'available',
        supplier_id: null,
        notes: null,
        update: jest.fn(async () => ({})),
      });

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);
      await useCase.execute({
        description: 'Defeito em produto acabado (lote de producao propria)',
        product_id: 93,
        lot_number: 'LOT-INTERNO-001',
        reportedBy: 8,
      });

      expect(Supplier.update).not.toHaveBeenCalled();
    });

    it('mantem o default neutro (nao emite UPDATE) quando o fornecedor ainda nao tem nenhum recebimento', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async (data: any) => ({ id: 54, supplier_id: data.supplier_id, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue({
        id: 12,
        lot_number: 'LOT-012',
        status: 'available',
        supplier_id: 99,
        notes: null,
        update: jest.fn(async () => ({})),
      });
      LotControl.count.mockResolvedValue(0);

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);
      await useCase.execute({
        description: 'RNC em lote sem historico de recebimentos contabilizados',
        product_id: 94,
        lot_number: 'LOT-012',
        reportedBy: 9,
      });

      expect(LotControl.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { supplier_id: 99 } })
      );
      expect(NonConformity.count).not.toHaveBeenCalled();
      expect(Supplier.update).not.toHaveBeenCalled();
    });

    it('cria a RNC com supplier_id herdado do lote quando o payload nao informa supplier_id', async () => {
      const nonConformitiesRepository = {
        create: jest.fn(async (data: any) => ({ id: 55, supplier_id: data.supplier_id, status: 'open' })),
      };

      LotControl.findOne.mockResolvedValue({
        id: 13,
        lot_number: 'LOT-013',
        status: 'available',
        supplier_id: 42,
        notes: null,
        update: jest.fn(async () => ({})),
      });
      LotControl.count.mockResolvedValue(4);
      NonConformity.count.mockResolvedValue(1);

      const useCase = new CreateNonConformityUseCase(nonConformitiesRepository as any);
      await useCase.execute({
        description: 'RNC sem supplier_id explicito no payload',
        product_id: 95,
        lot_number: 'LOT-013',
        reportedBy: 10,
      });

      expect(nonConformitiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ supplier_id: 42 }),
        expect.anything()
      );
    });
  });
});
