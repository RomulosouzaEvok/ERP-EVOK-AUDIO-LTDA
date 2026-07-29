import { calculateMrpPlan, MrpBomEdge, MrpDemand, MrpInventoryPosition } from '../../src/modules/mrp/application/mrpEngine';

describe('MRP Engine', () => {
  /**
   * Confirma estoque disponivel, reserva, seguranca, lote minimo e lead time.
   *
   * @returns Void.
   */
  it('gera ordem planejada considerando estoque, reserva, seguranca, lote minimo e lead time', () => {
    const dueDate = new Date('2026-08-20T00:00:00.000Z');
    const demands: MrpDemand[] = [
      { itemId: 'PA-15', quantity: 10, dueDate, sourceType: 'sales_order', sourceId: 'SO-1' },
    ];
    const edges: MrpBomEdge[] = [
      { parentItemId: 'PA-15', componentItemId: 'MP-IMA', quantityPer: 3, scrapPercentage: 0 },
    ];
    const inventory: MrpInventoryPosition[] = [
      { itemId: 'MP-IMA', onHand: 10, reserved: 2, safetyStock: 5, minimumLotSize: 10, leadTimeDays: 7 },
    ];

    const plan = calculateMrpPlan(demands, edges, inventory);

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      itemId: 'MP-IMA',
      grossRequirement: 30,
      availableStock: 3,
      netRequirement: 27,
      plannedQuantity: 30,
    });
    expect(plan[0].releaseDate.toISOString()).toBe('2026-08-13T00:00:00.000Z');
  });

  /**
   * Valida que demandas duplicadas para mesmo item/data viram uma unica ordem.
   *
   * @returns Void.
   */
  it('agrega demandas iguais sem duplicar ordens planejadas', () => {
    const dueDate = new Date('2026-09-01T00:00:00.000Z');
    const demands: MrpDemand[] = [
      { itemId: 'PA-12', quantity: 4, dueDate, sourceType: 'forecast' },
      { itemId: 'PA-12', quantity: 6, dueDate, sourceType: 'forecast' },
    ];
    const edges: MrpBomEdge[] = [
      { parentItemId: 'PA-12', componentItemId: 'MP-ARANHA', quantityPer: 1 },
    ];

    const plan = calculateMrpPlan(demands, edges, []);

    expect(plan).toHaveLength(1);
    expect(plan[0].grossRequirement).toBe(10);
    expect(plan[0].plannedQuantity).toBe(10);
  });
});
