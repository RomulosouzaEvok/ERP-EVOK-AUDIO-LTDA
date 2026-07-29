import { explodeBomRequirements, MrpBomEdge } from '../../src/modules/mrp/application/mrpEngine';

describe('BOM multinivel recursiva', () => {
  /**
   * Valida explosao da arvore de produto acabado para subconjunto e materia-prima.
   *
   * @returns Void.
   */
  it('agrega necessidades em estrutura N:M recursiva', () => {
    const dueDate = new Date('2026-08-10T00:00:00.000Z');
    const edges: MrpBomEdge[] = [
      { parentItemId: 'PA-12', componentItemId: 'SUB-CONE', quantityPer: 2 },
      { parentItemId: 'SUB-CONE', componentItemId: 'MP-COLA', quantityPer: 0.125 },
      { parentItemId: 'SUB-CONE', componentItemId: 'MP-FIO-COBRE', quantityPer: 0.333333 },
      { parentItemId: 'PA-12', componentItemId: 'MP-COLA', quantityPer: 0.05 },
    ];

    const result = explodeBomRequirements('PA-12', 10, dueDate, edges);

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 'SUB-CONE', grossRequirement: 20 }),
      expect.objectContaining({ itemId: 'MP-COLA', grossRequirement: 3 }),
      expect.objectContaining({ itemId: 'MP-FIO-COBRE', grossRequirement: 6.66666 }),
    ]));
  });

  /**
   * Garante que uma BOM circular nao derrube o MRP com recursao infinita.
   *
   * @returns Void.
   */
  it('bloqueia ciclo na arvore da BOM', () => {
    const edges: MrpBomEdge[] = [
      { parentItemId: 'A', componentItemId: 'B', quantityPer: 1 },
      { parentItemId: 'B', componentItemId: 'A', quantityPer: 1 },
    ];

    expect(() => explodeBomRequirements('A', 1, new Date('2026-08-10T00:00:00.000Z'), edges))
      .toThrow('Ciclo detectado na BOM');
  });
});
