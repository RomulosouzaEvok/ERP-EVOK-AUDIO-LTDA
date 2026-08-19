/**
 * Guard de regressao para o adapter de Facilities que consome estoque.
 *
 * O adapter nao pode voltar a mandar `reference_type` fora do ENUM de
 * `inventory_movements`. A origem predial segue rastreavel por
 * `description` + `reference_id`, enquanto o movimento gravado no banco
 * permanece como `adjustment`.
 *
 * @group unit
 */

describe('InventoryServiceAdapter', () => {
  let execute: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    execute = jest.fn(async (input: any) => input);

    jest.doMock('../../src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase', () => {
      return jest.fn().mockImplementation(() => ({
        execute,
      }));
    });
  });

  const cases = [
    ['maintenance ticket', 'facility_maintenance_ticket', 41],
    ['cleaning execution', 'facility_cleaning_execution', 84],
  ] as const;

  it.each(cases)('mapeia %s para reference_type adjustment', async (_label, referenceType, referenceId) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const InventoryServiceAdapter = require('../../src/modules/facilities/infrastructure/adapters/InventoryServiceAdapter');
    const adapter = new InventoryServiceAdapter();
    const transaction = { id: 'tx-fac-1' };

    await adapter.registerConsumption({
      item_id: 'item-123',
      quantity: 3,
      userId: 9,
      referenceType,
      referenceId,
      transaction,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: 'item-123',
        type: 'out',
        quantity: 3,
        description: `Consumo interno - Facilities (${referenceType} #${referenceId})`,
        reference_id: referenceId,
        reference_type: 'adjustment',
        warehouse_code: 'INSUMOS',
        userId: 9,
        transaction,
      })
    );
  });
});
