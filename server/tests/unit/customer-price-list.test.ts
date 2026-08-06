/**
 * Test: Tabela de preços por cliente (gap 1/3 do módulo `sales`)
 *
 * Cobre criação, atualização, desativação (soft delete), rejeição de
 * cliente/produto inexistente e detecção de sobreposição de vigência.
 *
 * @group unit
 */

import CreateCustomerPriceUseCase = require('../../src/modules/sales/application/use-cases/CreateCustomerPriceUseCase');
import UpdateCustomerPriceUseCase = require('../../src/modules/sales/application/use-cases/UpdateCustomerPriceUseCase');
import DeactivateCustomerPriceUseCase = require('../../src/modules/sales/application/use-cases/DeactivateCustomerPriceUseCase');
import ListCustomerPricesUseCase = require('../../src/modules/sales/application/use-cases/ListCustomerPricesUseCase');

function buildRepository(overrides: Partial<Record<string, any>> = {}) {
  const created: any[] = [];
  return {
    findClientById: jest.fn(async (id: number) => (id === 1 ? { id: 1, name: 'Cliente A' } : null)),
    findProductById: jest.fn(async (id: number) => (id === 10 ? { id: 10, name: 'Produto X' } : null)),
    listActiveCustomerPricesForProduct: jest.fn(async () => []),
    createCustomerPrice: jest.fn(async (data: any) => {
      const row: any = { id: created.length + 1, ...data };
      row.save = jest.fn(async () => row);
      created.push(row);
      return row;
    }),
    listCustomerPrices: jest.fn(async () => created),
    findCustomerPriceById: jest.fn(async (id: number) => created.find((p) => p.id === id) || null),
    __created: created,
    ...overrides,
  };
}

describe('CreateCustomerPriceUseCase', () => {
  it('cria um preco para cliente/produto existentes', async () => {
    const repo = buildRepository();
    const useCase = new CreateCustomerPriceUseCase(repo);

    const price = await useCase.execute({ customerId: 1, productId: 10, unitPrice: 99.9, userId: 7 });

    expect(price.customer_id).toBe(1);
    expect(price.product_id).toBe(10);
    expect(price.unit_price).toBe(99.9);
    expect(price.active).toBe(true);
    expect(price.created_by).toBe(7);
  });

  it('rejeita cliente inexistente', async () => {
    const repo = buildRepository();
    const useCase = new CreateCustomerPriceUseCase(repo);

    await expect(useCase.execute({ customerId: 999, productId: 10, unitPrice: 10, userId: 7 })).rejects.toThrow(
      /Cliente não encontrado/
    );
  });

  it('rejeita produto inexistente', async () => {
    const repo = buildRepository();
    const useCase = new CreateCustomerPriceUseCase(repo);

    await expect(useCase.execute({ customerId: 1, productId: 999, unitPrice: 10, userId: 7 })).rejects.toThrow(
      /Produto ID 999 não encontrado/
    );
  });

  it('rejeita vigencia com fim anterior ao inicio', async () => {
    const repo = buildRepository();
    const useCase = new CreateCustomerPriceUseCase(repo);

    await expect(
      useCase.execute({
        customerId: 1, productId: 10, unitPrice: 10, userId: 7,
        validFrom: '2026-06-01', validUntil: '2026-01-01',
      })
    ).rejects.toThrow(/vigência/);
  });

  it('rejeita sobreposicao de vigencia com preco ativo existente', async () => {
    const repo = buildRepository({
      listActiveCustomerPricesForProduct: jest.fn(async () => [
        { id: 5, valid_from: '2026-01-01', valid_until: '2026-12-31' },
      ]),
    });
    const useCase = new CreateCustomerPriceUseCase(repo);

    await expect(
      useCase.execute({ customerId: 1, productId: 10, unitPrice: 10, userId: 7, validFrom: '2026-06-01' })
    ).rejects.toThrow(/vigência sobreposta/);
  });
});

describe('UpdateCustomerPriceUseCase', () => {
  it('atualiza o preco unitario de um registro existente', async () => {
    const repo = buildRepository();
    const price = await repo.createCustomerPrice({
      customer_id: 1, product_id: 10, unit_price: 50, active: true, valid_from: null, valid_until: null,
    });
    const useCase = new UpdateCustomerPriceUseCase(repo);

    const updated = await useCase.execute({ customerId: 1, priceId: price.id, unitPrice: 75 });

    expect(updated.unit_price).toBe(75);
  });

  it('rejeita atualizar preco de outro cliente', async () => {
    const repo = buildRepository();
    const price = await repo.createCustomerPrice({ customer_id: 2, product_id: 10, unit_price: 50, active: true });
    const useCase = new UpdateCustomerPriceUseCase(repo);

    await expect(useCase.execute({ customerId: 1, priceId: price.id, unitPrice: 75 })).rejects.toThrow(
      /não encontrado/
    );
  });
});

describe('DeactivateCustomerPriceUseCase', () => {
  it('desativa (soft delete) um preco sem remove-lo fisicamente', async () => {
    const repo = buildRepository();
    const price = await repo.createCustomerPrice({ customer_id: 1, product_id: 10, unit_price: 50, active: true });
    const useCase = new DeactivateCustomerPriceUseCase(repo);

    const deactivated = await useCase.execute({ customerId: 1, priceId: price.id });

    expect(deactivated.active).toBe(false);
    expect(repo.__created).toHaveLength(1);
  });
});

describe('ListCustomerPricesUseCase', () => {
  it('rejeita listar precos de cliente inexistente', async () => {
    const repo = buildRepository();
    const useCase = new ListCustomerPricesUseCase(repo);

    await expect(useCase.execute({ customerId: 999 })).rejects.toThrow(/Cliente não encontrado/);
  });

  it('lista precos de um cliente existente', async () => {
    const repo = buildRepository();
    await repo.createCustomerPrice({ customer_id: 1, product_id: 10, unit_price: 50, active: true });
    const useCase = new ListCustomerPricesUseCase(repo);

    const prices = await useCase.execute({ customerId: 1 });
    expect(prices).toHaveLength(1);
  });
});
