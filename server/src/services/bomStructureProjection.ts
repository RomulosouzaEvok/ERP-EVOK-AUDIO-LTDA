/**
 * 🧬 bomStructureProjection — a estrutura de produto passa a ter UMA fonte.
 *
 * ## O gap G1 (auditoria da cadeia do produto, 2026-08-09)
 *
 * O ERP carregava **duas** estruturas de produto paralelas, com mestres e
 * chaves diferentes, e ninguém reconciliava as duas:
 *
 * | Estrutura | Mestre | Chave | Quem lia |
 * |---|---|---|---|
 * | `item_estruturas` | `items` | UUID | MRP (`SequelizeMrpRepository.listActiveEdges`), explosão de item |
 * | `bill_of_materials` | `products` | INTEGER | `BomService` → criação/liberação/**conclusão** de OP, custeio, reserva, quarentena |
 *
 * A única ponte entre elas era casamento de string (`products.code =
 * items.codigo`) — e ela nunca foi exercida para BOM. Resultado prático:
 * **planejamento e consumo podiam discordar sobre o que compõe um produto e
 * o sistema não tinha como perceber.** O MRP comprava contra uma árvore, a
 * produção consumia e custeava contra outra.
 *
 * ## Por que `bill_of_materials` sobreviveu (e não a "canônica" `items`)
 *
 * A decisão foi tomada com o código, não com preferência:
 *
 * 1. **É a única estrutura que governa dinheiro e estoque.** A liberação da
 *    OP reserva material por ela (`reserveMaterials`), a conclusão consome,
 *    baixa lote e **cifra o custo do produto acabado** por ela
 *    (`ChangeProductionOrderStatusUseCase`). Depois do G2, concluir OP sem
 *    BOM ativa **falha** — ela virou item obrigatório da corrente.
 * 2. **Sua chave é a que o resto do sistema usa.** `inventory_movements`,
 *    `lot_controls`, `stock_reservations`, `sale_items`,
 *    `purchase_order_items` e `production_orders` são todas `products.id`
 *    (INTEGER). `item_estruturas` é a única ilha de UUID da cadeia física.
 * 3. **O mestre de `item_estruturas` não é sistema de registro de nada
 *    transacional.** Conferido no banco real: `items.estoque_atual` é
 *    `0.000000` em 100% das linhas, enquanto `products.quantity` carrega os
 *    saldos. Tanto que o próprio MRP abandona `items` na hora que precisa de
 *    número: `SequelizeItemRepository.listMrpInventoryPositions` faz o
 *    crosswalk para `products` para ler saldo, reservado, mínimo e lead time.
 * 4. **Já tem o vocabulário de controle de alteração de engenharia que a
 *    ISO 9001 §8.5.6 exige** (`draft`/`active`/`inactive`/`superseded`,
 *    `revision`, `approved_by`, `approval_date`) — o mesmo ciclo que o G5
 *    exercitou em roteiro de manufatura.
 *
 * O `CLAUDE.md` registra "Item core intocado + extensões por domínio". Isso
 * segue valendo para **cadastro** (código, descrição, tipo, custo padrão,
 * catálogo de fornecedor, requisição, RFQ). O que muda é só a **estrutura**:
 * ela não é extensão de cadastro, é regra de consumo e de custo, e mora onde
 * o consumo e o custo moram.
 *
 * ## O que este módulo faz
 *
 * Projeta a BOM ativa (`bill_of_materials` × `bill_of_material_items`, em
 * `products.id`) para o formato de arestas em UUID que o motor de MRP já
 * consome, usando o crosswalk `products.code = items.codigo` que o resto do
 * ERP já usa (recebimento COMEX, conversão de requisição, adjudicação de
 * RFQ, movimentação de estoque). Nenhuma linha é copiada: a projeção é
 * **de leitura**, feita na hora. Não existe réplica para sair de sincronia.
 *
 * ## O buraco do crosswalk é reportado, não engolido
 *
 * Se um produto de uma BOM ativa não tiver `items.codigo` correspondente, a
 * aresta **não existe** para o MRP. Engolir isso em silêncio recriaria o G1
 * por outro caminho (planejamento cego para parte da árvore). Por isso
 * {@link listActiveStructure} devolve `unmapped` junto com `edges`, e o
 * consumidor é responsável por expor/registrar. Ver
 * `SequelizeMrpRepository.listStructureGaps`.
 *
 * @module services/bomStructureProjection
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { QueryTypes } = require('sequelize');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sequelize } = require('../models/index');

/**
 * Status de BOM considerado vigente. Confirmado contra `pg_enum`
 * (`enum_bill_of_materials_status` = `draft, active, inactive, superseded`)
 * — literal de enum inexistente é a classe de defeito nº 2 catalogada em
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`,
 * e nem typecheck nem teste unitário a pegam.
 */
const ACTIVE_BOM_STATUS = 'active';

/**
 * Projeção da BOM ativa em arestas pai→componente.
 *
 * Todos os nomes de coluna abaixo foram conferidos contra
 * `information_schema.columns` no banco real (mesma classe de defeito nº 3
 * do documento citado no cabeçalho do módulo): `bill_of_materials`
 * (`id`, `product_id`, `status`, `revision`), `bill_of_material_items`
 * (`bom_id`, `component_product_id`, `quantity`, `scrap_percentage`,
 * `sequence_order`), `products` (`id`, `code`), `items` (`id`, `codigo`).
 */
const ACTIVE_STRUCTURE_SQL = `
  SELECT
    parent_item.id        AS item_pai_id,
    component_item.id     AS item_componente_id,
    bom_item.quantity     AS quantidade,
    bom_item.scrap_percentage AS perda_percentual,
    bom.id                AS bom_id,
    bom.revision          AS revisao,
    parent_product.id     AS product_pai_id,
    component_product.id  AS product_componente_id,
    parent_product.code   AS codigo_pai,
    component_product.code AS codigo_componente
  FROM bill_of_materials bom
  JOIN bill_of_material_items bom_item
    ON bom_item.bom_id = bom.id
  JOIN products parent_product
    ON parent_product.id = bom.product_id
  JOIN products component_product
    ON component_product.id = bom_item.component_product_id
  LEFT JOIN items parent_item
    ON parent_item.codigo = parent_product.code
  LEFT JOIN items component_item
    ON component_item.codigo = component_product.code
  WHERE bom.status = :activeStatus
  ORDER BY bom.product_id ASC, bom_item.sequence_order ASC, bom_item.id ASC
`;

/** Aresta pai→componente no formato que o motor de MRP já consome. */
interface StructureEdge {
  item_pai_id: string;
  item_componente_id: string;
  quantidade: number;
  perda_percentual: number;
  /** Sempre `true`: a projeção só devolve arestas de BOM `active`. */
  ativo: true;
  bom_id: number;
  revisao: string | null;
  product_pai_id: number;
  product_componente_id: number;
  codigo_pai: string;
  codigo_componente: string;
}

/** Aresta de BOM ativa que o catálogo canônico `items` não consegue enxergar. */
interface StructureGap {
  bom_id: number;
  /** `parent` = o produto pai não tem item; `component` = o componente não tem. */
  side: 'parent' | 'component';
  product_id: number;
  codigo: string;
}

/**
 * Lê a estrutura vigente e a projeta em arestas de item (UUID).
 *
 * @param transaction - Transação Sequelize ativa (opcional).
 * @returns `edges` com as arestas projetáveis e `unmapped` com as arestas de
 *   BOM ativa que se perderam no crosswalk `products.code = items.codigo`.
 */
async function listActiveStructure(transaction?: unknown): Promise<{ edges: StructureEdge[]; unmapped: StructureGap[] }> {
  const rows = await sequelize.query(ACTIVE_STRUCTURE_SQL, {
    replacements: { activeStatus: ACTIVE_BOM_STATUS },
    type: QueryTypes.SELECT,
    ...(transaction ? { transaction } : {}),
  });

  const edges: StructureEdge[] = [];
  const unmapped: StructureGap[] = [];
  const seenGaps = new Set<string>();

  for (const row of (rows ?? []) as Record<string, any>[]) {
    const parentItemId = row.item_pai_id ? String(row.item_pai_id) : null;
    const componentItemId = row.item_componente_id ? String(row.item_componente_id) : null;

    if (!parentItemId || !componentItemId) {
      for (const [side, itemId, productId, codigo] of [
        ['parent', parentItemId, row.product_pai_id, row.codigo_pai],
        ['component', componentItemId, row.product_componente_id, row.codigo_componente],
      ] as [StructureGap['side'], string | null, unknown, unknown][]) {
        if (itemId) continue;
        const key = `${side}|${String(productId)}`;
        if (seenGaps.has(key)) continue;
        seenGaps.add(key);
        unmapped.push({
          bom_id: Number(row.bom_id),
          side,
          product_id: Number(productId),
          codigo: String(codigo ?? ''),
        });
      }
      continue;
    }

    edges.push({
      item_pai_id: parentItemId,
      item_componente_id: componentItemId,
      quantidade: Number(row.quantidade ?? 0),
      perda_percentual: Number(row.perda_percentual ?? 0),
      ativo: true,
      bom_id: Number(row.bom_id),
      revisao: row.revisao ?? null,
      product_pai_id: Number(row.product_pai_id),
      product_componente_id: Number(row.product_componente_id),
      codigo_pai: String(row.codigo_pai ?? ''),
      codigo_componente: String(row.codigo_componente ?? ''),
    });
  }

  return { edges, unmapped };
}

/**
 * Atalho para quem só quer as arestas (a maioria dos leitores).
 *
 * @param transaction - Transação Sequelize ativa (opcional).
 * @returns Arestas da estrutura vigente.
 */
async function listActiveEdges(transaction?: unknown): Promise<StructureEdge[]> {
  const { edges } = await listActiveStructure(transaction);
  return edges;
}

/**
 * Indica se existe caminho de `fromItemId` até `toItemId` na estrutura
 * vigente — usado para barrar ciclo antes de gravar uma aresta nova.
 *
 * @param fromItemId - Item de partida (UUID).
 * @param toItemId - Item de destino (UUID).
 * @returns `true` se `toItemId` é alcançável a partir de `fromItemId`.
 */
async function hasPathBetween(fromItemId: string, toItemId: string): Promise<boolean> {
  const edges = await listActiveEdges();

  const childrenByParent = new Map<string, string[]>();
  for (const edge of edges) {
    const children = childrenByParent.get(edge.item_pai_id) ?? [];
    children.push(edge.item_componente_id);
    childrenByParent.set(edge.item_pai_id, children);
  }

  const visited = new Set<string>();
  const stack = [String(fromItemId)];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === String(toItemId)) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of childrenByParent.get(current) ?? []) {
      if (!visited.has(child)) stack.push(child);
    }
  }

  return false;
}

/**
 * Indica se o item participa da estrutura vigente, como pai ou componente.
 *
 * Antes do G1 esta checagem olhava só `item_estruturas` — tabela que ninguém
 * alimentava. Na prática o guarda de inativação de item estava **cego para a
 * BOM de produção**: dava para inativar um item que é componente de uma BOM
 * ativa, e a OP só descobria na conclusão.
 *
 * @param itemId - Item canônico (UUID).
 * @returns `true` se o item aparece em qualquer ponta de uma BOM ativa.
 */
async function hasActiveParentOrComponent(itemId: string): Promise<boolean> {
  const edges = await listActiveEdges();
  const target = String(itemId);
  return edges.some((edge) => edge.item_pai_id === target || edge.item_componente_id === target);
}

/**
 * Arestas da estrutura vigente cujo pai é o item informado, já projetadas.
 *
 * @param itemPaiId - Item pai (UUID).
 * @returns Arestas filhas diretas.
 */
async function listActiveEdgesByParent(itemPaiId: string): Promise<StructureEdge[]> {
  const edges = await listActiveEdges();
  const target = String(itemPaiId);
  return edges.filter((edge) => edge.item_pai_id === target);
}

/**
 * Arestas da estrutura vigente **no espaço de `products.id`**, sem passar
 * pelo crosswalk para `items`.
 *
 * Por que uma consulta separada: {@link ACTIVE_STRUCTURE_SQL} faz `LEFT JOIN
 * items` e {@link listActiveStructure} **descarta** as arestas cujos dois
 * lados não têm item correspondente (elas viram `unmapped`). Isso é correto
 * para o MRP, que só sabe falar UUID, mas seria um buraco para a detecção de
 * ciclo na BOM: um produto sem `items.codigo` sumiria do grafo e o ciclo
 * passaria — justamente no caso em que o cadastro está mais incompleto.
 */
const ACTIVE_PRODUCT_STRUCTURE_SQL = `
  SELECT
    bom.product_id                AS parent_product_id,
    bom_item.component_product_id AS component_product_id
  FROM bill_of_materials bom
  JOIN bill_of_material_items bom_item
    ON bom_item.bom_id = bom.id
  WHERE bom.status = :activeStatus
`;

/**
 * Indica se existe caminho de `fromProductId` até `toProductId` na estrutura
 * vigente, no espaço de `products.id`.
 *
 * ## Para que serve
 *
 * Barrar **ciclo multinível** antes de gravar uma BOM (`G1-BOM-CICLO`).
 * `BomService.createBOM` só barrava auto-referência direta: `A` recebendo `B`
 * e, depois, `B` recebendo `A` entrava no banco sem aviso. O preço aparecia
 * longe daqui — `explodeBOM` recusa a árvore com 422, e depois do G2 produto
 * com estrutura inexplodível é **produto que não conclui OP**. A fábrica
 * descobriria na liberação/conclusão da ordem, com material já reservado.
 *
 * Uso: antes de gravar a aresta `pai → componente`, pergunte se já existe
 * caminho `componente → pai`. Se existir, a aresta nova fecharia o ciclo.
 * (Mesma ordem de argumentos de `CreateItemStructureUseCase`.)
 *
 * @param fromProductId - Produto de partida (`products.id`).
 * @param toProductId - Produto de destino (`products.id`).
 * @param transaction - Transação Sequelize ativa (opcional).
 * @returns `true` se `toProductId` é alcançável a partir de `fromProductId`.
 */
async function hasProductPathBetween(
  fromProductId: number | string,
  toProductId: number | string,
  transaction?: unknown,
): Promise<boolean> {
  const rows = await sequelize.query(ACTIVE_PRODUCT_STRUCTURE_SQL, {
    replacements: { activeStatus: ACTIVE_BOM_STATUS },
    type: QueryTypes.SELECT,
    ...(transaction ? { transaction } : {}),
  });

  const childrenByParent = new Map<string, string[]>();
  for (const row of (rows ?? []) as Record<string, any>[]) {
    const parent = String(row.parent_product_id);
    const children = childrenByParent.get(parent) ?? [];
    children.push(String(row.component_product_id));
    childrenByParent.set(parent, children);
  }

  const target = String(toProductId);
  const visited = new Set<string>();
  const stack = [String(fromProductId)];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of childrenByParent.get(current) ?? []) {
      if (!visited.has(child)) stack.push(child);
    }
  }

  return false;
}

// ATENÇÃO (armadilha conhecida do projeto): este objeto SUBSTITUI qualquer
// named export em tempo de execução (`require`). Toda função nova precisa
// aparecer aqui também — mesma regra de `quarantineBalanceService.ts`.
module.exports = {
  ACTIVE_BOM_STATUS,
  ACTIVE_STRUCTURE_SQL,
  ACTIVE_PRODUCT_STRUCTURE_SQL,
  listActiveStructure,
  listActiveEdges,
  listActiveEdgesByParent,
  hasPathBetween,
  hasProductPathBetween,
  hasActiveParentOrComponent,
};
