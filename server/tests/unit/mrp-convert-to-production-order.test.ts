/**
 * Test: Conversao de ordens planejadas do MRP em Ordens de Producao (OP).
 *
 * Valida ConvertPlannedOrdersToProductionOrderUseCase: fechamento do ciclo
 * MRP -> OP para itens de fabricacao propria (SUBCONJUNTO/PRODUTO_ACABADO),
 * rejeicao de itens de compra (MATERIA_PRIMA), rejeicao de produto legado
 * ausente/inativo/nao produzivel, bloqueio de status invalido, validacao de
 * BOM/disponibilidade de material (gap G16) e atualizacao das ordens
 * planejadas para EM_EXECUCAO.
 */

jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

jest.mock('../../src/services/bomService', () => ({
  checkAvailability: jest.fn(),
}));

import ConvertPlannedOrdersToProductionOrderUseCase = require('../../src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

const BomService = require('../../src/services/bomService');

/** Disponibilidade "material OK", default dos testes que nao exercitam G16. */
const MATERIAL_AVAILABLE = { available: true, max_possible_quantity: 999, missing_items: [] };

beforeEach(() => {
  jest.clearAllMocks();
  BomService.checkAvailability.mockResolvedValue(MATERIAL_AVAILABLE);
});

describe('ConvertPlannedOrdersToProductionOrderUseCase', () => {
  it('converte ordens planejadas de itens de fabricacao propria em uma OP por ordem', async () => {
    const plannedOrders = [
      {
        id: 'order-1',
        item_id: 'item-1',
        status: 'RASCUNHO',
        quantidade_planejada: '10.000000',
        data_necessidade: '2026-08-20',
      },
      {
        id: 'order-2',
        item_id: 'item-2',
        status: 'APROVADA',
        quantidade_planejada: '5.000000',
        data_necessidade: '2026-08-22',
      },
    ];

    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => plannedOrders),
      updatePlannedOrdersStatus: jest.fn(async () => undefined),
    };

    const itemRepository = {
      findById: jest.fn(async (id: string) => {
        if (id === 'item-1') return { id, codigo: 'ALTO-FALANTE-12', tipo: 'PRODUTO_ACABADO' };
        return { id, codigo: 'SUBCONJUNTO-BOBINA', tipo: 'SUBCONJUNTO' };
      }),
      findLegacyProductByItemId: jest.fn(async (itemId: string) => {
        if (itemId === 'item-1') {
          return { id: 501, code: 'ALTO-FALANTE-12', name: 'Alto-falante 12"', status: 'active', product_type: 'finished' };
        }
        return { id: 502, code: 'SUBCONJUNTO-BOBINA', name: 'Subconjunto Bobina', status: 'active', product_type: 'semi_finished' };
      }),
    };

    // Simula a semantica real de `nextOrderNumberForYear`: o proximo numero
    // sai do MAIOR sufixo ja emitido, enxergando as OPs criadas na propria
    // transacao (3 OPs pre-existentes no ano + as criadas neste laco).
    const emitted: string[] = [];
    const productionOrderRepository = {
      nextOrderNumberForYear: jest.fn(async (prefix: string) => `${prefix}-${String(3 + emitted.length + 1).padStart(4, '0')}`),
      create: jest.fn(async (data: any) => {
        emitted.push(data.order_number);
        return { id: Math.random(), ...data };
      }),
    };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    const result = await useCase.execute({
      planned_order_ids: ['order-1', 'order-2'],
      requester_id: 5,
    });

    expect(mrpRepository.findPlannedOrdersByIdsForUpdate).toHaveBeenCalledWith(['order-1', 'order-2'], { id: 'tx-1' });
    expect(productionOrderRepository.create).toHaveBeenCalledTimes(2);

    const [firstOrderPayload] = productionOrderRepository.create.mock.calls[0];
    expect(firstOrderPayload).toMatchObject({
      order_number: 'OP-' + new Date().getFullYear() + '-0004',
      product_id: 501,
      item_id: 'item-1',
      quantity: '10.000000',
      status: 'planned',
      due_date: '2026-08-20',
      created_by: 5,
    });

    const [secondOrderPayload] = productionOrderRepository.create.mock.calls[1];
    expect(secondOrderPayload).toMatchObject({
      product_id: 502,
      item_id: 'item-2',
      quantity: '5.000000',
    });

    // G16: cada OP do laco recebe um numero proprio — antes de 2026-08-09 a
    // numeracao era recalculada por contagem a cada iteracao, sem nenhuma
    // serializacao contra criacoes concorrentes.
    expect(secondOrderPayload.order_number).toBe('OP-' + new Date().getFullYear() + '-0005');
    expect(new Set(emitted).size).toBe(2);

    expect(mrpRepository.updatePlannedOrdersStatus).toHaveBeenCalledWith(
      ['order-1', 'order-2'],
      'EM_EXECUCAO',
      { id: 'tx-1' },
    );

    expect(result.converted_ids).toEqual(['order-1', 'order-2']);
    expect(result.production_orders).toHaveLength(2);
  });

  it('usa notas customizadas quando informadas', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(async () => undefined),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-1', codigo: 'X', tipo: 'PRODUTO_ACABADO' })),
      findLegacyProductByItemId: jest.fn(async () => ({ id: 1, code: 'X', name: 'Produto X', status: 'active', product_type: 'finished' })),
    };
    const productionOrderRepository = {
      nextOrderNumberForYear: jest.fn(async (prefix: string) => prefix + '-0001'),
      create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await useCase.execute({ planned_order_ids: ['order-1'], notes: 'Urgente cliente XPTO', requester_id: 1 });

    const [orderPayload] = productionOrderRepository.create.mock.calls[0];
    expect(orderPayload.notes).toBe('Urgente cliente XPTO');
  });

  it('rejeita ordens planejadas com status invalido com BusinessRuleError (422)', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'CONCLUIDA', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
        { id: 'order-2', item_id: 'item-2', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = { findById: jest.fn(), findLegacyProductByItemId: jest.fn() };
    const productionOrderRepository = { nextOrderNumberForYear: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1', 'order-2'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
    expect(mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError (404) se alguma ordem planejada nao existir', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = { findById: jest.fn(), findLegacyProductByItemId: jest.fn() };
    const productionOrderRepository = { nextOrderNumberForYear: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1', 'order-missing'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita item MATERIA_PRIMA (compra) com BusinessRuleError, orientando o uso da conversao para requisicao', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-mp', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-mp', codigo: 'PARAFUSO-M6', tipo: 'MATERIA_PRIMA' })),
      findLegacyProductByItemId: jest.fn(),
    };
    const productionOrderRepository = { nextOrderNumberForYear: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(itemRepository.findLegacyProductByItemId).not.toHaveBeenCalled();
    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita item sem produto legado correspondente (crosswalk por codigo ausente)', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-orfao', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-orfao', codigo: 'NOVO-SKU', tipo: 'PRODUTO_ACABADO' })),
      findLegacyProductByItemId: jest.fn(async () => null),
    };
    const productionOrderRepository = { nextOrderNumberForYear: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita produto legado inativo', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-1', codigo: 'X', tipo: 'PRODUTO_ACABADO' })),
      findLegacyProductByItemId: jest.fn(async () => ({ id: 1, code: 'X', name: 'Produto X', status: 'inactive', product_type: 'finished' })),
    };
    const productionOrderRepository = { nextOrderNumberForYear: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  /**
   * Gap G16: o caminho do MRP nao validava disponibilidade nenhuma, ao
   * contrario do caminho manual (`CreateProductionOrderUseCase`) — criava OP
   * sem material e sem BOM, que depois nao conseguia ser concluida.
   */
  describe('validacao de material alinhada ao caminho manual (G16)', () => {
    /** Cenario feliz reutilizado pelos casos de G16 (produto ativo e produzivel). */
    const buildDependencies = () => ({
      mrpRepository: {
        findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
          { id: 'order-1', item_id: 'item-1', status: 'APROVADA', quantidade_planejada: '10.000000', data_necessidade: '2026-08-20' },
        ]),
        updatePlannedOrdersStatus: jest.fn(async () => undefined),
      },
      itemRepository: {
        findById: jest.fn(async () => ({ id: 'item-1', codigo: 'ALTO-FALANTE-12', tipo: 'PRODUTO_ACABADO' })),
        findLegacyProductByItemId: jest.fn(async () => ({ id: 501, code: 'ALTO-FALANTE-12', name: 'Alto-falante 12"', status: 'active', product_type: 'finished' })),
      },
      productionOrderRepository: {
        nextOrderNumberForYear: jest.fn(async (prefix: string) => `${prefix}-0001`),
        create: jest.fn(async (data: any) => ({ id: 1, ...data })),
      },
    });

    it('bloqueia a conversao quando falta material para a quantidade planejada', async () => {
      const { mrpRepository, itemRepository, productionOrderRepository } = buildDependencies();
      BomService.checkAvailability.mockResolvedValue({
        available: false,
        max_possible_quantity: 4,
        missing_items: [{ component_code: 'IMA-FERRITE', needed: 10, available: 4, deficit: 6 }],
      });

      const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
        mrpRepository as any,
        itemRepository as any,
        productionOrderRepository as any,
      );

      // Falha pela REGRA de disponibilidade, nao por validacao anterior
      // (produto/item do mock sao validos e chegam ate a checagem).
      await expect(
        useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
      ).rejects.toThrow(/material minimo disponivel/i);

      expect(BomService.checkAvailability).toHaveBeenCalledWith(501, 10);
      expect(productionOrderRepository.create).not.toHaveBeenCalled();
      expect(mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
    });

    it('converte o 404 de "sem BOM ativa" em erro de negocio didatico, sem criar OP', async () => {
      const { mrpRepository, itemRepository, productionOrderRepository } = buildDependencies();
      BomService.checkAvailability.mockRejectedValue(
        Object.assign(new Error('Produto ID 501 nao possui BOM ativa.'), { statusCode: 404 }),
      );

      const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
        mrpRepository as any,
        itemRepository as any,
        productionOrderRepository as any,
      );

      const error = await useCase
        .execute({ planned_order_ids: ['order-1'], requester_id: 1 })
        .catch((e: any) => e);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error.message).toMatch(/estrutura \(BOM\) ativa/i);
      expect(productionOrderRepository.create).not.toHaveBeenCalled();
    });

    it('propaga erro nao-404 de BomService sem mascarar como regra de negocio', async () => {
      const { mrpRepository, itemRepository, productionOrderRepository } = buildDependencies();
      BomService.checkAvailability.mockRejectedValue(
        Object.assign(new Error('Profundidade maxima excedida (ciclo na BOM).'), { statusCode: 422 }),
      );

      const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
        mrpRepository as any,
        itemRepository as any,
        productionOrderRepository as any,
      );

      await expect(
        useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
      ).rejects.toThrow(/Profundidade maxima excedida/);

      expect(productionOrderRepository.create).not.toHaveBeenCalled();
    });

    it('cria a OP quando ha BOM ativa e material disponivel', async () => {
      const { mrpRepository, itemRepository, productionOrderRepository } = buildDependencies();
      BomService.checkAvailability.mockResolvedValue(MATERIAL_AVAILABLE);

      const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
        mrpRepository as any,
        itemRepository as any,
        productionOrderRepository as any,
      );

      const result = await useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 });

      expect(result.production_orders).toHaveLength(1);
      expect(productionOrderRepository.create).toHaveBeenCalledTimes(1);
    });
  });
});
