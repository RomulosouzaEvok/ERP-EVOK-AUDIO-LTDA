jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-lab-unit-1', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn(), finished: undefined };
      if (callback) {
        return callback(transaction);
      }
      return transaction;
    }),
  },
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'LABORATORIO' ? 3 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

import CreateAcousticTestUseCase = require('../../src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase');
import { ValidationError } from '../../src/errors';

jest.mock('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase', () => {
  return jest.fn().mockImplementation(() => ({
    execute: jest.fn(async (input: any) => ({ id: 777, ...input })),
  }));
});

jest.mock('../../src/modules/nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository', () => {
  return jest.fn().mockImplementation(() => ({}));
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreateNonConformityUseCaseMock = require('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WarehouseStockService = require('../../src/services/warehouseStockService');

describe('Use cases do modulo de Laboratorio', () => {
  beforeEach(() => {
    CreateNonConformityUseCaseMock.mockClear();
    WarehouseStockService.getWarehouseByCode.mockClear();
    WarehouseStockService.removeFromWarehouse.mockClear();
  });

  describe('CreateAcousticTestUseCase — calculo automatico de passed', () => {
    it('passed=true quando result esta dentro da faixa [min, max]', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 1, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      const result = await useCase.execute({
        product_id: 1,
        test_type: 'thd',
        result: 5,
        specification_min: 0,
        specification_max: 10,
        testerId: 42,
      });

      expect(laboratoryRepository.createTest).toHaveBeenCalledWith(
        expect.objectContaining({ passed: true, tester_id: 42, result: 5 }),
        expect.anything()
      );
      expect(result.passed).toBe(true);
    });

    it('passed=false quando result esta fora da faixa [min, max]', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 2, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      const result = await useCase.execute({
        product_id: 1,
        test_type: 'thd',
        result: 15,
        specification_min: 0,
        specification_max: 10,
        testerId: 42,
      });

      expect(result.passed).toBe(false);
      expect(laboratoryRepository.updateTest).not.toHaveBeenCalled();
    });

    it('passed=true quando result respeita apenas specification_min informado', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 3, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      const result = await useCase.execute({
        product_id: 1,
        test_type: 'power_rms',
        result: 50,
        specification_min: 30,
        testerId: 1,
      });

      expect(result.passed).toBe(true);
    });

    it('tester_id vem sempre do usuario autenticado, nunca do body', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 4, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      await useCase.execute({
        product_id: 1,
        test_type: 'impedance',
        result: 8,
        specification_min: 4,
        specification_max: 16,
        testerId: 99,
      } as any);

      expect(laboratoryRepository.createTest).toHaveBeenCalledWith(
        expect.objectContaining({ tester_id: 99 }),
        expect.anything()
      );
    });

    it('rejeita com 422 (ValidationError) quando nao ha result nem faixa de especificacao', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);

      await expect(
        useCase.execute({ product_id: 1, test_type: 'noise', testerId: 1 })
      ).rejects.toMatchObject({
        constructor: ValidationError,
        details: {
          product_id: 1,
          test_type: 'noise',
          missing_fields: ['result', 'specification_min', 'specification_max'],
        },
      });
      expect(laboratoryRepository.createTest).not.toHaveBeenCalled();
    });
  });

  describe('CreateAcousticTestUseCase — criacao de RNC no fail', () => {
    it('cria RNC via CreateNonConformityUseCase quando passed=false e create_rnc_on_fail=true, e grava non_conformity_id', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 10, ...data })),
        updateTest: jest.fn(async (id: number, data: any) => ({ id, non_conformity_id: data.non_conformity_id })),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      const result = await useCase.execute({
        product_id: 1,
        lot_number: 'LOTE-001',
        test_type: 'thd',
        result: 20,
        specification_min: 0,
        specification_max: 10,
        create_rnc_on_fail: true,
        testerId: 7,
      });

      expect(CreateNonConformityUseCaseMock).toHaveBeenCalledTimes(1);
      const executeMock = CreateNonConformityUseCaseMock.mock.results[0].value.execute;
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: 1,
          origin: 'final',
          defect_type: 'acoustic',
          severity: 'major',
          lot_number: 'LOTE-001',
          reportedBy: 7,
        })
      );
      expect(laboratoryRepository.updateTest).toHaveBeenCalledWith(10, { non_conformity_id: 777 });
      expect(result.non_conformity_id).toBe(777);
    });

    it('NAO cria RNC quando passed=false mas create_rnc_on_fail nao foi informado', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 11, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      await useCase.execute({
        product_id: 1,
        test_type: 'thd',
        result: 20,
        specification_min: 0,
        specification_max: 10,
        testerId: 7,
      });

      expect(CreateNonConformityUseCaseMock).not.toHaveBeenCalled();
      expect(laboratoryRepository.updateTest).not.toHaveBeenCalled();
    });

    it('NAO cria RNC quando passed=true mesmo com create_rnc_on_fail=true', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 12, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      await useCase.execute({
        product_id: 1,
        test_type: 'thd',
        result: 5,
        specification_min: 0,
        specification_max: 10,
        create_rnc_on_fail: true,
        testerId: 7,
      });

      expect(CreateNonConformityUseCaseMock).not.toHaveBeenCalled();
      expect(laboratoryRepository.updateTest).not.toHaveBeenCalled();
    });
  });

  describe('CreateAcousticTestUseCase — consumo de teste destrutivo (UC-42-E)', () => {
    it('debita o deposito LABORATORIO quando consumed_quantity > 0, na mesma transacao do registro do teste', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 20, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      await useCase.execute({
        product_id: 5,
        test_type: 'life',
        result: 10,
        specification_min: 5,
        consumed_quantity: 3,
        testerId: 7,
      });

      expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('LABORATORIO', expect.anything());
      expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledWith(5, 3, 3, expect.anything());
    });

    it('nao debita nada quando consumed_quantity esta ausente ou e zero', async () => {
      const laboratoryRepository = {
        createTest: jest.fn(async (data: any) => ({ id: 21, ...data })),
        updateTest: jest.fn(),
      };

      const useCase = new CreateAcousticTestUseCase(laboratoryRepository as any);
      await useCase.execute({
        product_id: 5,
        test_type: 'life',
        result: 10,
        specification_min: 5,
        testerId: 7,
      });
      await useCase.execute({
        product_id: 5,
        test_type: 'life',
        result: 10,
        specification_min: 5,
        consumed_quantity: 0,
        testerId: 7,
      });

      expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
    });
  });
});
