/**
 * Test: DeactivateItemUseCase HTTP 409
 *
 * Valida que inativação de item com vínculos ativos retorna HTTP 409 (Conflict),
 * não HTTP 422 (Business Rule Violation).
 *
 * Critério de aceite F.2: Item vinculado a BOM/OP/movimento/lote deve retornar 409
 *
 * @group unit
 * @ticket F.2-Sprint-F
 */

jest.mock('../../src/models/index', () => ({
  ProductionOrder: { count: jest.fn(async () => 0) },
  InventoryMovement: { count: jest.fn(async () => 0) },
  LotControl: { count: jest.fn(async () => 0) },
  MrpOrdemPlanejada: { count: jest.fn(async () => 0) },
  Product: { findAll: jest.fn(async () => []) }
}));

import DeactivateItemUseCase = require('../../src/modules/items/application/use-cases/DeactivateItemUseCase');
import { ConflictError } from '../../src/errors';

describe('DeactivateItemUseCase - HTTP 409 (F.2)', () => {
  it('deve retornar ConflictError (409) quando item possui BOM ativa', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({
        id,
        codigo: 'SKU-001',
        descricao: 'Item Teste',
        status: 'ATIVO'
      })),
      update: jest.fn(),
    };

    const itemEstruturaRepository = {
      hasActiveParentOrComponent: jest.fn(async () => true), // BOM ativa encontrada
    };

    const useCase = new DeactivateItemUseCase(itemRepository as any, itemEstruturaRepository as any);

    try {
      await useCase.execute({ itemId: 'item-123' });
      fail('Esperava ConflictError ser lançado');
    } catch (error: any) {
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toContain('vinculos ativos');
      expect(itemRepository.update).not.toHaveBeenCalled();
    }
  });

  it('deve retornar ConflictError (409) com detalhes dos vínculos encontrados', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({
        id,
        codigo: 'SKU-002',
        descricao: 'Item com Vínculos'
      })),
      update: jest.fn(),
    };

    const itemEstruturaRepository = {
      hasActiveParentOrComponent: jest.fn(async () => true),
    };

    const useCase = new DeactivateItemUseCase(itemRepository as any, itemEstruturaRepository as any);

    try {
      await useCase.execute({ itemId: 'item-456' });
      fail('Esperava ConflictError ser lançado');
    } catch (error: any) {
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.details).toEqual(
        expect.objectContaining({
          estrutura_ativa: true,
        })
      );
    }
  });

  it('deve permitir inativação quando não há vínculos ativos', async () => {
    const itemRepository = {
      findById: jest.fn(async (id: string) => ({
        id,
        codigo: 'SKU-003',
        descricao: 'Item Sem Vínculos'
      })),
      update: jest.fn(async (id: string, data: any) => ({ id, ...data })),
    };

    const itemEstruturaRepository = {
      hasActiveParentOrComponent: jest.fn(async () => false), // Nenhuma BOM ativa
    };

    const useCase = new DeactivateItemUseCase(itemRepository as any, itemEstruturaRepository as any);

    const result = await useCase.execute({ itemId: 'item-789' });

    expect(result).toEqual(expect.objectContaining({
      id: 'item-789',
      status: 'INATIVO'
    }));
    expect(itemRepository.update).toHaveBeenCalledWith('item-789', { status: 'INATIVO' });
  });

  it('deve retornar 404 quando item não existir', async () => {
    const { NotFoundError } = require('../../src/errors');
    const itemRepository = {
      findById: jest.fn(async () => null), // Item não existe
      update: jest.fn(),
    };

    const itemEstruturaRepository = {
      hasActiveParentOrComponent: jest.fn(),
    };

    const useCase = new DeactivateItemUseCase(itemRepository as any, itemEstruturaRepository as any);

    await expect(useCase.execute({ itemId: 'inexistente' }))
      .rejects
      .toThrow(NotFoundError);

    expect(itemRepository.update).not.toHaveBeenCalled();
  });
});
