/**
 * Test: Catalogo Item x Fornecedor (item_suppliers)
 *
 * Valida CreateItemSupplierUseCase e UpdateItemSupplierUseCase:
 * regra do `preferred` (zera os demais vinculos do item em transacao) e
 * conflito 409 quando o vinculo item-fornecedor ja existe.
 */

const mockTransaction = {
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
  finished: undefined as any,
};

jest.mock('../../src/models/index', () => ({
  Supplier: {
    findByPk: jest.fn(async (id: number) => (id === 1 ? { id: 1, company_name: 'Fornecedor Teste' } : null)),
  },
  sequelize: {
    transaction: jest.fn(async () => mockTransaction),
  },
}));

import CreateItemSupplierUseCase = require('../../src/modules/items/application/use-cases/CreateItemSupplierUseCase');
import UpdateItemSupplierUseCase = require('../../src/modules/items/application/use-cases/UpdateItemSupplierUseCase');
import { ConflictError, NotFoundError } from '../../src/errors';

describe('CreateItemSupplierUseCase', () => {
  const itemRepository = {
    findById: jest.fn(async (id: string) => (id === 'item-1' ? { id } : null)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria vinculo item-fornecedor com sucesso', async () => {
    const itemSupplierRepository = {
      findByItemAndSupplier: jest.fn(async () => null),
      create: jest.fn(async (data: any) => ({ id: 10, ...data })),
      clearPreferredForItem: jest.fn(async () => {}),
      findById: jest.fn(async (id: number) => ({ id, item_id: 'item-1', supplier_id: 1, preferred: false })),
    };

    const useCase = new CreateItemSupplierUseCase(itemRepository as any, itemSupplierRepository as any);
    const result = await useCase.execute({ itemId: 'item-1', supplier_id: 1, unit_price: 10.5 });

    expect(itemSupplierRepository.create).toHaveBeenCalledTimes(1);
    expect(itemSupplierRepository.clearPreferredForItem).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 10, item_id: 'item-1', supplier_id: 1 });
  });

  it('zera preferred dos demais vinculos quando preferred=true', async () => {
    const itemSupplierRepository = {
      findByItemAndSupplier: jest.fn(async () => null),
      create: jest.fn(async (data: any) => ({ id: 11, ...data })),
      clearPreferredForItem: jest.fn(async () => {}),
      findById: jest.fn(async (id: number) => ({ id, item_id: 'item-1', supplier_id: 1, preferred: true })),
    };

    const useCase = new CreateItemSupplierUseCase(itemRepository as any, itemSupplierRepository as any);
    await useCase.execute({ itemId: 'item-1', supplier_id: 1, preferred: true });

    expect(itemSupplierRepository.clearPreferredForItem).toHaveBeenCalledWith('item-1', 11, mockTransaction);
  });

  it('lanca ConflictError (409) se o vinculo ja existir', async () => {
    const itemSupplierRepository = {
      findByItemAndSupplier: jest.fn(async () => ({ id: 1, item_id: 'item-1', supplier_id: 1 })),
      create: jest.fn(),
      clearPreferredForItem: jest.fn(),
      findById: jest.fn(),
    };

    const useCase = new CreateItemSupplierUseCase(itemRepository as any, itemSupplierRepository as any);

    await expect(
      useCase.execute({ itemId: 'item-1', supplier_id: 1 })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(itemSupplierRepository.create).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se o item nao existir', async () => {
    const itemSupplierRepository = {
      findByItemAndSupplier: jest.fn(),
      create: jest.fn(),
      clearPreferredForItem: jest.fn(),
      findById: jest.fn(),
    };

    const useCase = new CreateItemSupplierUseCase(itemRepository as any, itemSupplierRepository as any);

    await expect(
      useCase.execute({ itemId: 'item-inexistente', supplier_id: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanca NotFoundError se o fornecedor nao existir', async () => {
    const itemSupplierRepository = {
      findByItemAndSupplier: jest.fn(),
      create: jest.fn(),
      clearPreferredForItem: jest.fn(),
      findById: jest.fn(),
    };

    const useCase = new CreateItemSupplierUseCase(itemRepository as any, itemSupplierRepository as any);

    await expect(
      useCase.execute({ itemId: 'item-1', supplier_id: 999 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateItemSupplierUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atualiza vinculo e zera preferred dos demais quando preferred=true', async () => {
    const itemSupplierRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({ id: 5, item_id: 'item-1', supplier_id: 1, preferred: false })
        .mockResolvedValueOnce({ id: 5, item_id: 'item-1', supplier_id: 1, preferred: true }),
      update: jest.fn(async () => {}),
      clearPreferredForItem: jest.fn(async () => {}),
    };

    const useCase = new UpdateItemSupplierUseCase(itemSupplierRepository as any);
    const result = await useCase.execute({ itemId: 'item-1', linkId: 5, preferred: true, unit_price: 20 });

    expect(itemSupplierRepository.update).toHaveBeenCalledWith(5, { unit_price: 20, preferred: true }, mockTransaction);
    expect(itemSupplierRepository.clearPreferredForItem).toHaveBeenCalledWith('item-1', 5, mockTransaction);
    expect(result).toMatchObject({ id: 5, preferred: true });
  });

  it('lanca NotFoundError se o vinculo nao pertencer ao item informado', async () => {
    const itemSupplierRepository = {
      findById: jest.fn(async () => ({ id: 5, item_id: 'outro-item', supplier_id: 1 })),
      update: jest.fn(),
      clearPreferredForItem: jest.fn(),
    };

    const useCase = new UpdateItemSupplierUseCase(itemSupplierRepository as any);

    await expect(
      useCase.execute({ itemId: 'item-1', linkId: 5, unit_price: 20 })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(itemSupplierRepository.update).not.toHaveBeenCalled();
  });
});
