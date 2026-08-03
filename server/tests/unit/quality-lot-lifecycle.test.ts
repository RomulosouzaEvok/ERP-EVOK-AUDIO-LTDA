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
 *   transacao da criacao da RNC.
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
  },
}));

import ReleaseLotUseCase = require('../../src/modules/inventory/application/use-cases/ReleaseLotUseCase');
import BlockLotUseCase = require('../../src/modules/inventory/application/use-cases/BlockLotUseCase');
import CreateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase');
import { ValidationError, NotFoundError, BusinessRuleError } from '../../src/errors';

const { sequelize } = require('../../src/config/database');
const { LotControl } = require('../../src/models/index');

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

      await expect(useCase.execute({ id: 3 })).rejects.toBeInstanceOf(BusinessRuleError);
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
      ).rejects.toBeInstanceOf(BusinessRuleError);
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
});
