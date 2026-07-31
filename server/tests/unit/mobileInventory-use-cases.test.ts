import ScanItemUseCase = require('../../src/modules/mobileInventory/application/use-cases/ScanItemUseCase');
import BatchScanUseCase = require('../../src/modules/mobileInventory/application/use-cases/BatchScanUseCase');
import { ValidationError, NotFoundError } from '../../src/errors';

describe('Use cases de inventário mobile', () => {
  it('rejeita scan sem product_code, quantity ou type', async () => {
    const mobileInventoryRepository = {
      findProductByCode: jest.fn(),
    };

    const useCase = new ScanItemUseCase(mobileInventoryRepository as any);

    await expect(
      useCase.execute({ product_code: 'ABC', userId: 1, transaction: {} })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mobileInventoryRepository.findProductByCode).not.toHaveBeenCalled();
  });

  it('lança NotFoundError ao escanear produto inexistente', async () => {
    const mobileInventoryRepository = {
      findProductByCode: jest.fn(async () => null),
    };

    const useCase = new ScanItemUseCase(mobileInventoryRepository as any);

    await expect(
      useCase.execute({ product_code: 'XYZ', quantity: 5, type: 'in', userId: 1, transaction: {} })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita saída de estoque quando quantidade disponível é insuficiente', async () => {
    const mobileInventoryRepository = {
      findProductByCode: jest.fn(async () => ({ id: 1, name: 'Driver 6"', code: 'DRV-6', quantity: 2 })),
    };

    const useCase = new ScanItemUseCase(mobileInventoryRepository as any);

    await expect(
      useCase.execute({ product_code: 'DRV-6', quantity: 5, type: 'out', userId: 1, transaction: {} })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita lote de scan vazio', async () => {
    const mobileInventoryRepository = {
      findProductByCode: jest.fn(),
    };

    const useCase = new BatchScanUseCase(mobileInventoryRepository as any);

    await expect(useCase.execute({ items: [], userId: 1, transaction: {} })).rejects.toBeInstanceOf(ValidationError);
  });
});
