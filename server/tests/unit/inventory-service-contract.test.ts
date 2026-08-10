/**
 * Guarda de contrato do `services/inventoryService`.
 *
 * ## Por que este teste existe
 *
 * O arquivo mistura duas convencoes de export: `export function` (ESM) e um
 * `module.exports = { ... }` no fim, que **substitui** todos os named exports
 * em tempo de execucao. Todo consumidor real do servico o carrega por
 * `require(...)` (`ChangeProductionOrderStatusUseCase`, `CreateSaleUseCase`,
 * `ChangeSaleStatusUseCase`, recebimento de compras...), ou seja: quem manda
 * e a lista do `module.exports`.
 *
 * O modo de falha e cruel — uma funcao nova exportada apenas com `export`
 * passa por `tsc` e pela suite inteira (que mocka o servico), e so explode em
 * producao como `X is not a function`, ja dentro de uma transacao. Foi
 * exatamente o que aconteceu ao adicionar `releaseAllReservationsForOrder`
 * (gap G3, 2026-08-09).
 *
 * `services/saleStockService` (gap G9, 2026-08-10) nasceu com a mesma
 * convencao mista e por isso entra na mesma guarda.
 *
 * @group unit
 * @ticket G3-Onda2
 * @ticket G9-Onda3
 */

jest.mock('../../src/models/index', () => ({
  Product: { findByPk: jest.fn(), update: jest.fn() },
  InventoryMovement: { create: jest.fn() },
  ProductionOrderReservation: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), count: jest.fn() },
  Warehouse: { findOne: jest.fn(), findByPk: jest.fn() },
  ProductWarehouseStock: { findOne: jest.fn(), create: jest.fn() },
}));

const InventoryService = require('../../src/services/inventoryService');
const SaleStockService = require('../../src/services/saleStockService');

const EXPECTED_FUNCTIONS = [
  'consume',
  'receive',
  'adjust',
  'reserve',
  'releaseReservation',
  'releaseAllReservationsForOrder',
  'releaseAllReservationsForSale',
  'listOrderReservations',
  'listSaleReservations',
  'recalculateReservedCache',
];

describe('inventoryService — contrato de export (require/CommonJS)', () => {
  it.each(EXPECTED_FUNCTIONS)('expoe %s como funcao via require', (name) => {
    expect(typeof InventoryService[name]).toBe('function');
  });

  it('nao expoe operacao de reserva sem dono: reserve exige productionOrderId ou saleId', async () => {
    await expect(
      InventoryService.reserve(1, 10, 1, { LOCK: { UPDATE: 'UPDATE' } } as any, {})
    ).rejects.toMatchObject({ statusCode: 400, details: { rule: 'reservation_requires_owner' } });
  });

  it('nao expoe liberacao sem dono: releaseReservation exige productionOrderId ou saleId', async () => {
    await expect(
      InventoryService.releaseReservation(1, 10, 1, { LOCK: { UPDATE: 'UPDATE' } } as any, {})
    ).rejects.toMatchObject({ statusCode: 400, details: { rule: 'reservation_requires_owner' } });
  });

  it('nao aceita reserva com dois donos (OP e venda ao mesmo tempo)', async () => {
    await expect(
      InventoryService.reserve(1, 10, 1, { LOCK: { UPDATE: 'UPDATE' } } as any, { productionOrderId: 1, saleId: 2 })
    ).rejects.toMatchObject({ statusCode: 400, details: { rule: 'reservation_requires_exactly_one_owner' } });
  });
});

describe('saleStockService — contrato de export (require/CommonJS)', () => {
  it('expoe commitInvoicedStock como funcao via require', () => {
    expect(typeof SaleStockService.commitInvoicedStock).toBe('function');
  });
});
