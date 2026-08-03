import CreateProjectUseCase = require('../../src/modules/engineering/application/use-cases/CreateProjectUseCase');
import CreateDrawingUseCase = require('../../src/modules/engineering/application/use-cases/CreateDrawingUseCase');
import ReleaseDrawingUseCase = require('../../src/modules/engineering/application/use-cases/ReleaseDrawingUseCase');
import ObsoleteDrawingUseCase = require('../../src/modules/engineering/application/use-cases/ObsoleteDrawingUseCase');
import GetTechnicalSpecUseCase = require('../../src/modules/engineering/application/use-cases/GetTechnicalSpecUseCase');
import UpsertTechnicalSpecUseCase = require('../../src/modules/engineering/application/use-cases/UpsertTechnicalSpecUseCase');
import { ConflictError, BusinessRuleError, NotFoundError } from '../../src/errors';

describe('Use cases do modulo de Engenharia', () => {
  describe('CreateProjectUseCase', () => {
    it('rejeita project_code duplicado com ConflictError (409)', async () => {
      const engineeringRepository = {
        findProjectByCode: jest.fn(async () => ({ id: 1, project_code: 'PROJ-001' })),
        createProject: jest.fn(),
      };

      const useCase = new CreateProjectUseCase(engineeringRepository as any);

      await expect(
        useCase.execute({ project_code: 'PROJ-001', name: 'Novo alto-falante' })
      ).rejects.toBeInstanceOf(ConflictError);
      expect(engineeringRepository.createProject).not.toHaveBeenCalled();
    });

    it('cria projeto com defaults quando codigo e unico', async () => {
      const engineeringRepository = {
        findProjectByCode: jest.fn(async () => null),
        createProject: jest.fn(async (data: any) => ({ id: 10, ...data })),
      };

      const useCase = new CreateProjectUseCase(engineeringRepository as any);
      const result = await useCase.execute({ project_code: ' PROJ-002 ', name: 'Woofer 12"' });

      expect(engineeringRepository.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          project_code: 'PROJ-002',
          project_type: 'new_product',
          priority: 'normal',
        })
      );
      expect(result.id).toBe(10);
    });
  });

  describe('CreateDrawingUseCase', () => {
    it('rejeita numero+revisao duplicados com ConflictError (409)', async () => {
      const engineeringRepository = {
        findDrawingByNumberAndRevision: jest.fn(async () => ({ id: 1 })),
        createDrawing: jest.fn(),
      };

      const useCase = new CreateDrawingUseCase(engineeringRepository as any);

      await expect(
        useCase.execute({ product_id: 1, drawing_number: 'DWG-001', title: 'Montagem woofer' })
      ).rejects.toBeInstanceOf(ConflictError);
      expect(engineeringRepository.createDrawing).not.toHaveBeenCalled();
    });

    it('cria desenho com status draft e revisao default 00', async () => {
      const engineeringRepository = {
        findDrawingByNumberAndRevision: jest.fn(async () => null),
        createDrawing: jest.fn(async (data: any) => ({ id: 5, ...data })),
      };

      const useCase = new CreateDrawingUseCase(engineeringRepository as any);
      await useCase.execute({ product_id: 1, drawing_number: 'DWG-002', title: 'Detalhe cone' });

      expect(engineeringRepository.createDrawing).toHaveBeenCalledWith(
        expect.objectContaining({ revision: '00', status: 'draft' })
      );
    });
  });

  describe('ReleaseDrawingUseCase', () => {
    it('libera desenho em draft -> released, definindo approved_by e approval_date', async () => {
      const engineeringRepository = {
        findDrawingById: jest.fn(async () => ({ id: 1, status: 'draft' })),
        updateDrawing: jest.fn(async (id: number, data: any) => ({ id, ...data })),
      };

      const useCase = new ReleaseDrawingUseCase(engineeringRepository as any);
      const result = await useCase.execute({ id: 1, approvedBy: 42 });

      expect(engineeringRepository.updateDrawing).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'released', approved_by: 42 })
      );
      expect(result.approval_date).toBeDefined();
    });

    it('rejeita liberacao de desenho que nao esta em draft com BusinessRuleError (422)', async () => {
      const engineeringRepository = {
        findDrawingById: jest.fn(async () => ({ id: 1, status: 'released' })),
        updateDrawing: jest.fn(),
      };

      const useCase = new ReleaseDrawingUseCase(engineeringRepository as any);

      await expect(useCase.execute({ id: 1, approvedBy: 42 })).rejects.toBeInstanceOf(BusinessRuleError);
      expect(engineeringRepository.updateDrawing).not.toHaveBeenCalled();
    });

    it('lanca NotFoundError se desenho nao existir', async () => {
      const engineeringRepository = {
        findDrawingById: jest.fn(async () => null),
        updateDrawing: jest.fn(),
      };

      const useCase = new ReleaseDrawingUseCase(engineeringRepository as any);

      await expect(useCase.execute({ id: 999, approvedBy: 1 })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('ObsoleteDrawingUseCase', () => {
    it('torna obsoleto desenho em released -> obsolete', async () => {
      const engineeringRepository = {
        findDrawingById: jest.fn(async () => ({ id: 1, status: 'released' })),
        updateDrawing: jest.fn(async (id: number, data: any) => ({ id, ...data })),
      };

      const useCase = new ObsoleteDrawingUseCase(engineeringRepository as any);
      const result = await useCase.execute({ id: 1 });

      expect(engineeringRepository.updateDrawing).toHaveBeenCalledWith(1, { status: 'obsolete' });
      expect(result.status).toBe('obsolete');
    });

    it('rejeita obsolescencia de desenho que nao esta em released com BusinessRuleError (422)', async () => {
      const engineeringRepository = {
        findDrawingById: jest.fn(async () => ({ id: 1, status: 'draft' })),
        updateDrawing: jest.fn(),
      };

      const useCase = new ObsoleteDrawingUseCase(engineeringRepository as any);

      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(BusinessRuleError);
      expect(engineeringRepository.updateDrawing).not.toHaveBeenCalled();
    });
  });

  describe('GetTechnicalSpecUseCase', () => {
    it('lanca NotFoundError se item nao existir', async () => {
      const engineeringRepository = {
        findItemById: jest.fn(async () => null),
        findTechnicalSpecByItemId: jest.fn(),
      };

      const useCase = new GetTechnicalSpecUseCase(engineeringRepository as any);

      await expect(useCase.execute({ itemId: 'uuid-inexistente' })).rejects.toBeInstanceOf(NotFoundError);
      expect(engineeringRepository.findTechnicalSpecByItemId).not.toHaveBeenCalled();
    });

    it('retorna null em data quando item existe mas nao tem ficha tecnica', async () => {
      const engineeringRepository = {
        findItemById: jest.fn(async () => ({ id: 'uuid-1' })),
        findTechnicalSpecByItemId: jest.fn(async () => null),
      };

      const useCase = new GetTechnicalSpecUseCase(engineeringRepository as any);
      const result = await useCase.execute({ itemId: 'uuid-1' });

      expect(result).toBeNull();
    });
  });

  describe('UpsertTechnicalSpecUseCase', () => {
    it('lanca NotFoundError se item nao existir', async () => {
      const engineeringRepository = {
        findItemById: jest.fn(async () => null),
        findTechnicalSpecByItemId: jest.fn(),
        upsertTechnicalSpec: jest.fn(),
      };

      const useCase = new UpsertTechnicalSpecUseCase(engineeringRepository as any);

      await expect(
        useCase.execute({ itemId: 'uuid-inexistente', atributos: { fs_hz: 45 } })
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(engineeringRepository.upsertTechnicalSpec).not.toHaveBeenCalled();
    });

    it('cria ficha tecnica com familia_tecnica default quando item existe e nao ha spec previa', async () => {
      const engineeringRepository = {
        findItemById: jest.fn(async () => ({ id: 'uuid-1' })),
        findTechnicalSpecByItemId: jest.fn(async () => null),
        upsertTechnicalSpec: jest.fn(async (itemId: string, data: any) => ({ item_id: itemId, ...data })),
      };

      const useCase = new UpsertTechnicalSpecUseCase(engineeringRepository as any);
      const result = await useCase.execute({ itemId: 'uuid-1', atributos: { fs_hz: 45, qts: 0.35 } });

      expect(engineeringRepository.upsertTechnicalSpec).toHaveBeenCalledWith(
        'uuid-1',
        expect.objectContaining({ familia_tecnica: 'ALTO_FALANTE', atributos: { fs_hz: 45, qts: 0.35 } })
      );
      expect(result.item_id).toBe('uuid-1');
    });

    it('preserva familia_tecnica existente quando nao informada no payload', async () => {
      const engineeringRepository = {
        findItemById: jest.fn(async () => ({ id: 'uuid-1' })),
        findTechnicalSpecByItemId: jest.fn(async () => ({ item_id: 'uuid-1', familia_tecnica: 'CABO' })),
        upsertTechnicalSpec: jest.fn(async (itemId: string, data: any) => ({ item_id: itemId, ...data })),
      };

      const useCase = new UpsertTechnicalSpecUseCase(engineeringRepository as any);
      await useCase.execute({ itemId: 'uuid-1', atributos: { re_ohms: 4 } });

      expect(engineeringRepository.upsertTechnicalSpec).toHaveBeenCalledWith(
        'uuid-1',
        expect.objectContaining({ familia_tecnica: 'CABO' })
      );
    });
  });
});
