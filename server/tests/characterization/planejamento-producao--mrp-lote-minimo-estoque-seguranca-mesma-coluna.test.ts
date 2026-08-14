/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * ALVO C — Lote mínimo e estoque de segurança lendo a MESMA coluna
 * (BR-PP-013).
 *
 * Comportamento congelado:
 *   1. Quando existe produto legado correspondente (crosswalk
 *      `products.code = items.codigo`), `SequelizeItemRepository.listMrpInventoryPositions`
 *      preenche `estoque_seguranca` E `lote_minimo` com o MESMO valor:
 *      `liveProduct.min_quantity`. Não há dois campos de origem — é a
 *      MESMA leitura, atribuída a duas saídas com semânticas diferentes.
 *   2. No caminho de FALLBACK (item sem produto legado casado por código),
 *      os dois campos continuam distintos: `item.estoque_seguranca` e
 *      `item.lote_minimo`. A colisão só existe quando o crosswalk casa.
 *   3. Efeito observável dentro do motor MRP (`mrpEngine.calculateMrpPlan`):
 *      o MESMO número, vindo dessa única coluna, aciona DUAS políticas de
 *      PCP diferentes na MESMA rodada de cálculo — `safetyStock` REDUZ o
 *      estoque disponível (`availableStock = onHand - reserved - safetyStock`)
 *      e `minimumLotSize` ARREDONDA a quantidade líquida para cima até o
 *      próximo múltiplo do MESMO número. Não é uma coincidência de nomes:
 *      é literalmente o mesmo inteiro entrando duas vezes na conta, uma
 *      subtraindo e outra multiplicando.
 *
 * Âncoras:
 *   - BR-PP-013 — BUSINESS_RULE_CANDIDATES_planejamento-producao.md:250-274 (achado mais forte do passo 26,
 *     HIGH/CONFIRMED — nenhum teste confrontava as duas semânticas antes deste arquivo)
 *   - server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts:109-110 (a coluna única)
 *   - server/src/modules/mrp/application/mrpEngine.ts:246-254 (consumo cumulativo de safetyStock e minimumLotSize)
 *
 * Nota metodológica (já registrada no passo 26): `mrp-engine.test.ts:18`
 * usa `safetyStock:5` ≠ `minimumLotSize:10` — valores DISTINTOS de
 * propósito para exercitar a fórmula, o que faz aquele teste NÃO
 * confrontar o defeito real (a coluna única do repositório). Este arquivo
 * fecha essa lacuna explicitamente, com o valor IDÊNTICO que o repositório
 * de fato produz.
 *
 * Estilo: UNIT. `listMrpInventoryPositions` acessa banco via
 * `../../../../models/index`, mockado por completo; `calculateMrpPlan` é
 * função pura, sem I/O.
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 */

jest.mock('../../src/models/index', () => ({
  Item: { findAll: jest.fn() },
  Product: { findAll: jest.fn() },
  LotControl: { findAll: jest.fn(async () => []) },
}));

import { calculateMrpPlan, MrpBomEdge, MrpDemand, MrpInventoryPosition } from '../../src/modules/mrp/application/mrpEngine';

const { Item, Product } = require('../../src/models/index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
import SequelizeItemRepository = require('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository');

describe('PASSO 30 — BR-PP-013: estoque_seguranca e lote_minimo lendo a mesma coluna', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('com produto legado casado por código: estoque_seguranca e lote_minimo saem IDÊNTICOS de liveProduct.min_quantity', async () => {
    Item.findAll.mockResolvedValueOnce([
      {
        id: 'uuid-bob-500',
        codigo: 'BOB-500',
        descricao: 'Bobina 500',
        estoque_atual: 0, // items.estoque_atual é sempre 0 na base real (achado do G7/bomStructureProjection) — não deveria aparecer aqui, pois há liveProduct.
        estoque_reservado: 0,
        // Valores distintos de propósito nos campos NATIVOS do item — provam
        // que a colisão não vem daqui, e sim da substituição pelo crosswalk.
        estoque_seguranca: 11,
        lote_minimo: 22,
        lead_time_dias: 3,
      },
    ]);
    Product.findAll.mockResolvedValueOnce([
      { id: 501, code: 'BOB-500', quantity: 800, reserved_quantity: 50, min_quantity: 500, lead_time: 15 },
    ]);

    const repository = new SequelizeItemRepository();
    const [position] = await repository.listMrpInventoryPositions(['uuid-bob-500']);

    expect(position.estoque_seguranca).toBe(500);
    expect(position.lote_minimo).toBe(500);
    // A asserção central do achado: as duas colunas de saída, com
    // semânticas de PCP diferentes, batem porque são a MESMA leitura.
    expect(position.estoque_seguranca).toBe(position.lote_minimo);
    // E nenhuma delas é o valor nativo do item — o crosswalk SUBSTITUI, não complementa.
    expect(position.estoque_seguranca).not.toBe(11);
    expect(position.lote_minimo).not.toBe(22);
  });

  it('SEM produto legado casado por código (fallback): estoque_seguranca e lote_minimo permanecem campos distintos do item', async () => {
    Item.findAll.mockResolvedValueOnce([
      {
        id: 'uuid-sem-produto',
        codigo: 'ITEM-SEM-PRODUTO',
        descricao: 'Item sem produto legado correspondente',
        estoque_atual: 40,
        estoque_reservado: 2,
        estoque_seguranca: 11,
        lote_minimo: 22,
        lead_time_dias: 3,
      },
    ]);
    Product.findAll.mockResolvedValueOnce([]); // nenhum produto casa pelo código — Product.findAll nem é chamado com código nenhum em comum

    const repository = new SequelizeItemRepository();
    const [position] = await repository.listMrpInventoryPositions(['uuid-sem-produto']);

    expect(position.estoque_seguranca).toBe(11);
    expect(position.lote_minimo).toBe(22);
    expect(position.estoque_seguranca).not.toBe(position.lote_minimo);
  });

  it('efeito observável no motor MRP: um único min_quantity=500 (vindo da coluna única) reduz o disponível E arredonda a compra para o mesmo múltiplo, na mesma rodada', () => {
    // Reproduz exatamente o par (safetyStock, minimumLotSize) que o teste
    // acima prova que o repositório de fato produz quando há crosswalk:
    // os dois iguais a 500, não valores artificialmente distintos.
    const dueDate = new Date('2026-09-01T00:00:00.000Z');
    const demands: MrpDemand[] = [
      { itemId: 'PRODUTO-FINAL', quantity: 620, dueDate, sourceType: 'sales_order', sourceId: 'SO-9' },
    ];
    const edges: MrpBomEdge[] = [
      { parentItemId: 'PRODUTO-FINAL', componentItemId: 'BOB-500', quantityPer: 1 },
    ];
    const inventory: MrpInventoryPosition[] = [
      { itemId: 'BOB-500', onHand: 1000, reserved: 0, safetyStock: 500, minimumLotSize: 500, leadTimeDays: 0 },
    ];

    const plan = calculateMrpPlan(demands, edges, inventory);

    expect(plan).toHaveLength(1);
    // (a) safetyStock=500 REDUZ o disponível: max(0, 1000 - 0 - 500) = 500.
    expect(plan[0].availableStock).toBe(500);
    // (b) netRequirement = max(0, 620 - 500) = 120.
    expect(plan[0].netRequirement).toBe(120);
    // (c) minimumLotSize=500 — o MESMO 500 usado em (a) como "segurança" —
    // arredonda os 120 líquidos para cima até o próximo múltiplo de 500:
    // ceil(120/500)*500 = 500. Um único campo do banco decidiu as DUAS contas.
    expect(plan[0].plannedQuantity).toBe(500);
  });
});
