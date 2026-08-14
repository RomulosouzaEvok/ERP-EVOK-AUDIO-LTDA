/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * ALVO B — Divergência de explosão de BOM entre o motor MRP e o motor de
 * Produção (BR-PP-016b, achado 7 do passo 26/29).
 *
 * Contexto (leia antes dos testes — por que a comparação NÃO roda lado a
 * lado sobre o MESMO dado): o ERP mantém DUAS estruturas de produto
 * paralelas, com mestre e chave DIFERENTES (server/src/services/bomStructureProjection.ts:9-18):
 *   - `item_estruturas` sobre `items` (UUID) — é o que `mrpEngine` explode.
 *   - `bill_of_materials` sobre `products` (INTEGER) — é o que
 *     `BomService.explodeBOM` explode, e o que efetivamente reserva, consome
 *     e custeia a Ordem de Produção.
 * Não existe hoje uma ponte testada que garanta as duas árvores idênticas
 * (a única ponte é `products.code = items.codigo`, nunca exercida para BOM —
 * mesmo cabeçalho, linhas 14-18). Logo, não é possível montar UM ÚNICO
 * fixture de banco e rodar os dois motores sobre ele para comparar a SAÍDA
 * ponta a ponta dentro de um teste unit (isso exigiria popular as duas
 * tabelas em sincronia, o que é precisamente o que a análise diz não estar
 * garantido). Em vez disso, este arquivo caracteriza CADA motor
 * isoladamente sobre uma estrutura logicamente equivalente (produto final
 * -> subconjunto com saldo próprio -> matéria-prima do subconjunto) na
 * representação NATIVA de cada um, e congela o CRITÉRIO DE PARADA de cada
 * um. A divergência fica provada por diferença de comportamento diante do
 * mesmo desenho de estrutura, não por diff de output sobre o mesmo dado.
 *
 * Comportamento congelado:
 *   1. `mrpEngine.explodeBomRequirements` (motor MRP) NÃO tem nenhum
 *      conceito de subconjunto estocável. `MrpBomEdge` não tem campo
 *      `is_phantom`, e mesmo que um chamador force esse campo no objeto em
 *      runtime (TS não impede em JS puro), o motor o IGNORA: desce por
 *      TODA aresta ativa, sempre, incondicionalmente. O único freio que
 *      existe é detecção de CICLO por caminho de ancestrais — não há teto
 *      de profundidade (`maxDepth`) configurável.
 *   2. `BomService.explodeBOM` (motor de Produção) PARA a explosão em
 *      qualquer componente com `is_phantom !== true` que tenha BOM própria
 *      (subconjunto ESTOCÁVEL, o padrão): o componente entra na lista como
 *      peça pronta, os filhos dele NUNCA são consultados. Só desce quando
 *      `is_phantom === true` (subconjunto FANTASMA) — e, nesse caso, o
 *      próprio subconjunto DESAPARECE da lista final (só os filhos entram).
 *      Tem também um teto numérico de profundidade (`maxDepth`, default 10,
 *      BR-PP-017) independente da detecção de ciclo.
 *   3. Efeito prático da divergência: para a MESMA estrutura lógica
 *      (PA -> SUB estocável -> RAW), o motor MRP devolve SUB **e** RAW como
 *      necessidade; o motor de Produção devolve SÓ SUB (RAW nunca aparece).
 *      As duas listas de necessidade materialmente DIVERGEM para o mesmo
 *      produto.
 *
 * Âncoras:
 *   - BR-PP-016 (subconjunto estocável × fantasma) — BUSINESS_RULE_CANDIDATES_planejamento-producao.md:323-342
 *   - BR-PP-016b (MRP ignora is_phantom) — BUSINESS_RULE_CANDIDATES_planejamento-producao.md:344-354
 *   - BR-PP-017 (maxDepth=10, UNKNOWN se é regra de negócio) — BUSINESS_RULE_CANDIDATES_planejamento-producao.md:356-375
 *   - server/src/modules/mrp/application/mrpEngine.ts:154-210 (explodeBomRequirements — sem is_phantom, sem maxDepth)
 *   - server/src/services/bomService.ts:423-570 (explodeBOM — is_phantom decide, maxDepth em bomService.ts:459-464)
 *
 * Estilo: os dois blocos abaixo são UNIT — `explodeBomRequirements` é
 * função pura (sem I/O); `BomService.explodeBOM` acessa banco via
 * `../models/index`, mockado por completo (padrão já usado em
 * `tests/unit/bom-tree-cycle.test.ts` para o mesmo serviço).
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 */

import { explodeBomRequirements, MrpBomEdge } from '../../src/modules/mrp/application/mrpEngine';

// Mock completo de `../../src/models/index`, no mesmo padrão de
// `tests/unit/bom-tree-cycle.test.ts` (que testa o mesmo BomService) — feito
// no TOPO do arquivo, fora de qualquer `describe`, para hoisting correto.
// `mrpEngine` (bloco acima) não toca `models/index`; este mock só afeta o
// bloco de `BomService.explodeBOM` abaixo. `Item` e `LotControl` entram como
// stubs harmless: `Item` só é lido pelo caminho de ESCRITA
// (assertProductIsEngineeringType), fora do escopo de `explodeBOM`;
// `LotControl.findAll` alimenta `quarantineBalanceService.sumWithheldByProduct`,
// chamado ao FINAL de toda explosão — sem lotes retidos, devolve mapa vazio e
// não altera os números desta caracterização (G7, fora do escopo do achado
// BR-PP-016b).
jest.mock('../../src/models/index', () => ({
  BillOfMaterial: { findOne: jest.fn() },
  BillOfMaterialItem: { findAll: jest.fn() },
  Product: { findByPk: jest.fn() },
  Item: { findOne: jest.fn() },
  LotControl: { findAll: jest.fn(async () => []) },
}));

describe('PASSO 30 — Motor MRP (mrpEngine) — critério de parada: NENHUM além de ciclo', () => {
  it('desce por TODA aresta ativa mesmo quando a aresta carrega is_phantom=false — campo que o motor de Produção usa para PARAR, e que o motor MRP simplesmente não conhece', () => {
    const dueDate = new Date('2026-08-10T00:00:00.000Z');
    // Estrutura conceitualmente equivalente ao caso do REPARO citado em
    // BR-PP-016 (bomService.ts:333): PA (produto final) -> SUB (subconjunto
    // com saldo/BOM próprios) -> RAW (matéria-prima do subconjunto).
    // `is_phantom: false` é anexado à aresta de propósito — em runtime JS
    // nada impede o campo extra; o objetivo é provar que o motor não o lê.
    const edges = [
      { parentItemId: 'PA', componentItemId: 'SUB', quantityPer: 1, is_phantom: false } as MrpBomEdge & { is_phantom: boolean },
      { parentItemId: 'SUB', componentItemId: 'RAW', quantityPer: 2 },
    ];

    const requirements = explodeBomRequirements('PA', 1, dueDate, edges as MrpBomEdge[]);
    const itemIds = requirements.map((requirement) => requirement.itemId).sort();

    // O motor devolve TANTO o subconjunto (SUB) QUANTO a matéria-prima dele
    // (RAW) — não existe, em `MrpBomEdge` nem no laço `visit`
    // (mrpEngine.ts:184-206), nenhuma leitura de `is_phantom` que pare a
    // descida no nível do subconjunto.
    expect(itemIds).toEqual(['RAW', 'SUB']);
  });

  it('não tem teto de profundidade (maxDepth) — só detecção de ciclo por caminho de ancestrais; uma cadeia linear de 50 níveis sem ciclo passa sem erro', () => {
    // bomService.explodeBOM tem maxDepth=10 (BR-PP-017, bomService.ts:459-464)
    // como freio INDEPENDENTE da detecção de ciclo. mrpEngine não tem
    // equivalente: o único freio é `path.includes(edge.componentItemId)`
    // (mrpEngine.ts:188), que só dispara em ciclo real, nunca em cadeia
    // linear profunda sem repetição de item.
    const dueDate = new Date('2026-08-10T00:00:00.000Z');
    const DEPTH = 50;
    const edges: MrpBomEdge[] = [];
    for (let level = 0; level < DEPTH; level++) {
      edges.push({ parentItemId: `NIVEL-${level}`, componentItemId: `NIVEL-${level + 1}`, quantityPer: 1 });
    }

    let requirements: ReturnType<typeof explodeBomRequirements> = [];
    expect(() => {
      requirements = explodeBomRequirements('NIVEL-0', 1, dueDate, edges);
    }).not.toThrow();

    // NIVEL-1 até NIVEL-50: os 50 níveis aparecem, nenhum foi barrado por
    // profundidade — ao contrário do que aconteceria no motor de Produção
    // com o maxDepth default (10).
    expect(requirements).toHaveLength(DEPTH);
    expect(requirements.map((requirement) => requirement.itemId)).toContain(`NIVEL-${DEPTH}`);
  });
});

describe('PASSO 30 — Motor de Produção (BomService.explodeBOM) — critério de parada: is_phantom da linha do PAI', () => {
  const { BillOfMaterial, BillOfMaterialItem, Product } = require('../../src/models/index');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BomService = require('../../src/services/bomService');

  const PA_ID = 1;
  const SUB_ID = 2;
  const RAW_ID = 3;

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Produto acabado PA (id=1) tem uma linha de BOM para SUB (id=2). SUB tem
   * BOM própria (subBOM id=99) — é fisicamente um subconjunto com estrutura,
   * exatamente como o REPARO citado em BR-PP-016. O que muda entre os dois
   * testes abaixo é só `is_phantom` na linha do PAI.
   *
   * @param isPhantom - Valor de `is_phantom` na linha da BOM de PA que
   *   referencia SUB — decide se a explosão para em SUB ou desce nele.
   */
  function stubStructure(isPhantom: boolean): void {
    BillOfMaterial.findOne.mockImplementation(async ({ where }: any) => {
      if (where.product_id === PA_ID) {
        return {
          id: 10,
          items: [
            {
              id: 100,
              component_product_id: SUB_ID,
              quantity: 1,
              scrap_percentage: 0,
              is_phantom: isPhantom,
              component_type: 'semi_finished',
              unit: 'un',
              is_critical: false,
              notes: null,
            },
          ],
        };
      }
      if (where.product_id === SUB_ID) {
        // SUB TEM BOM ativa própria — é o que o torna um "subconjunto" e
        // não um parafuso. `is_phantom` está na linha do PAI (acima), não
        // aqui: ter BOM própria NÃO basta para decidir a descida (BR-PP-016).
        return { id: 99, items: [] };
      }
      // RAW (id=3) não tem BOM própria — é folha por natureza.
      return null;
    });

    BillOfMaterialItem.findAll.mockResolvedValue([
      {
        id: 200,
        component_product_id: RAW_ID,
        quantity: 2,
        scrap_percentage: 0,
        is_phantom: false,
        component_type: 'raw_material',
        unit: 'un',
        is_critical: false,
        notes: null,
      },
    ]);

    Product.findByPk.mockImplementation(async (id: number) => {
      if (id === PA_ID) return { id: PA_ID, name: 'Produto Acabado PA', code: 'PA' };
      if (id === SUB_ID) {
        return { id: SUB_ID, name: 'Subconjunto SUB (REPARO)', code: 'SUB', cost_price: 50, quantity: 100, min_quantity: 5, product_type: 'semi_finished' };
      }
      if (id === RAW_ID) {
        return { id: RAW_ID, name: 'Materia-prima RAW', code: 'RAW', cost_price: 5, quantity: 500, min_quantity: 50, product_type: 'raw_material' };
      }
      return null;
    });
  }

  it('is_phantom=false (padrão, subconjunto ESTOCÁVEL): PARA em SUB — RAW nunca é consultado nem aparece na lista', async () => {
    stubStructure(false);

    const result = await BomService.explodeBOM(PA_ID, 1);

    expect(result.components).toHaveLength(1);
    expect(result.components[0]).toMatchObject({
      component_id: SUB_ID,
      is_subassembly: true,
      sub_bom_id: 99,
    });
    // A explosão NUNCA foi buscar os itens da sub-BOM de SUB — é a prova
    // direta de que a descida não aconteceu.
    expect(BillOfMaterialItem.findAll).not.toHaveBeenCalled();
  });

  it('is_phantom=true (subconjunto FANTASMA): DESCE em SUB — RAW aparece na lista e o próprio SUB desaparece dela', async () => {
    stubStructure(true);

    const result = await BomService.explodeBOM(PA_ID, 1);

    expect(result.components.map((component: any) => component.component_id)).toEqual([RAW_ID]);
    expect(BillOfMaterialItem.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bom_id: 99 } }),
    );
    // SUB some da lista final: quando fantasma, o pai consome os FILHOS,
    // não o subconjunto em si (BR-PP-016, bomService.ts:494-497).
    expect(result.components.some((component: any) => component.component_id === SUB_ID)).toBe(false);
  });

  it('confronto direto: MESMO desenho de estrutura (PA->SUB->RAW), UM campo (is_phantom) decide se RAW aparece na lista do motor de Produção — o motor MRP nunca faz essa pergunta (teste anterior)', async () => {
    // Este teste é deliberadamente redundante com os dois acima: existe só
    // para deixar a divergência (achado BR-PP-016b) legível em UM lugar,
    // sem depender de quem lê saltar entre dois `describe`.
    stubStructure(false);
    const estocavel = await BomService.explodeBOM(PA_ID, 1);
    expect(estocavel.components.map((c: any) => c.component_id)).not.toContain(RAW_ID);

    jest.clearAllMocks();
    stubStructure(true);
    const fantasma = await BomService.explodeBOM(PA_ID, 1);
    expect(fantasma.components.map((c: any) => c.component_id)).toContain(RAW_ID);
  });
});
