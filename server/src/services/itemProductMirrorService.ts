/**
 * 🪞 Service: ItemProductMirrorService
 *
 * Espelhamento do cadastro mestre entre `items` (UUID, tela Item Mestre,
 * carga inicial) e `products` (INTEGER, mestre transacional de BOM, OP,
 * MRP, vendas e estoque).
 *
 * ## Por que existe (diagnóstico de 2026-08-12)
 *
 * Os dois cadastros conviviam sem NENHUMA sincronização — a única ponte era
 * o casamento de texto `products.code = items.codigo`, usado em 12 pontos do
 * código. As duas falhas eram reais e medidas:
 *
 * - **Item sem produto gêmeo** → 422 duro em RFQ→pedido
 *   (`AwardRfqUseCase`), requisição→pedido
 *   (`ConvertRequisitionToPurchaseOrdersUseCase`) e recebimento COMEX
 *   (`ReceiveImportProcessUseCase`) — a carga inicial inteira ficava
 *   inutilizável para compras.
 * - **Produto sem item gêmeo** → a aresta some em silêncio da projeção de
 *   estrutura que o MRP lê (`bomStructureProjection.ts`, aresta `unmapped`).
 *
 * ## A regra
 *
 * - Criar um **item** (qualquer tipo) garante o produto gêmeo na MESMA
 *   transação. Os tipos de suprimento/patrimônio também ganham gêmeo —
 *   sem linha em `products` eles seriam **incompráveis** (a conversão
 *   requisição→pedido, o recebimento e o estoque operam por `product_id`).
 *   Quem os mantém fora da BOM é a guarda `G1-BOM-TIPO-NAO-PRODUTIVO`
 *   (`bomService.ts`), que verifica o TIPO DO ITEM pelo crosswalk.
 * - Criar um **produto** garante o item gêmeo na MESMA transação (fecha a
 *   porta dos fixtures/telas legadas que criavam produto órfão).
 * - Se a contraparte JÁ existe, ela é adotada como gêmea (nenhum dado é
 *   sobrescrito na criação) — não há caso de conflito "os dois existem com
 *   dados diferentes" na criação.
 * - A atualização propaga só no sentido **item → produto** (o Item Mestre é
 *   o dono do cadastro; `products` segue sendo o dono do TRANSACIONAL:
 *   saldo/reserva continuam sendo escritos pelos fluxos de estoque, e por
 *   isso `quantity`/`reserved_quantity` NÃO são propagados na atualização).
 *
 * O mapeamento de tipos é o mesmo do backfill oficial
 * (`scripts/backfill/02b_product_to_item.ts`), mantido aqui em espelho para
 * o serviço não depender de código de script.
 *
 * Destino de longo prazo (pós-Go-Live): migrar as FKs transacionais para
 * `items` virar mestre único e aposentar o crosswalk — ver
 * `docs/governance/auditorias/DIAGNOSTICO_CATALOGO_DUPLO_2026-08-12.md`.
 */

const { Item, Product } = require('../models/index');

/**
 * `items.tipo` (pt-BR) → `products.product_type` (legado, en).
 *
 * `USO_E_CONSUMO` e `ATIVO_IMOBILIZADO` degradam para `raw_material` porque
 * o enum legado não tem tipo próprio para eles — a classificação de negócio
 * verdadeira mora em `items.tipo`, e é ELA que a guarda da BOM consulta.
 */
const TIPO_TO_PRODUCT_TYPE: Record<string, string> = {
  MATERIA_PRIMA: 'raw_material',
  SUBCONJUNTO: 'semi_finished',
  PRODUTO_ACABADO: 'finished',
  USO_E_CONSUMO: 'raw_material',
  ATIVO_IMOBILIZADO: 'raw_material',
};

/**
 * `products.product_type` → `items.tipo`. `component` degrada para
 * `MATERIA_PRIMA` — mesma decisão do backfill 02b.
 *
 * @param {string} productType - `product_type` do produto.
 * @returns {string} Tipo do item mestre correspondente.
 */
function mapProductTypeToItemTipo(productType: string): string {
  if (productType === 'finished') return 'PRODUTO_ACABADO';
  if (productType === 'semi_finished') return 'SUBCONJUNTO';
  return 'MATERIA_PRIMA';
}

class ItemProductMirrorService {
  /**
   * Garante o produto gêmeo de um item produtivo, na transação informada.
   *
   * @param {Object} item - Item mestre recém-criado/carregado (model ou POJO
   *   com `codigo`, `descricao`, `tipo`, `unidade`, `status`,
   *   `estoque_atual`, `estoque_seguranca`, `custo_padrao`,
   *   `lead_time_dias`).
   * @param {Object} transaction - Transação Sequelize ativa.
   * @returns {Promise<Object|null>} O produto gêmeo (existente ou criado);
   *   `null` apenas quando o item não tem código ou tipo reconhecido.
   */
  static async ensureProductMirrorForItem(item: any, transaction: any): Promise<any | null> {
    if (!item?.codigo || !TIPO_TO_PRODUCT_TYPE[item.tipo]) return null;

    const existing = await Product.findOne({ where: { code: item.codigo }, transaction });
    if (existing) return existing;

    return Product.create({
      code: item.codigo,
      name: item.descricao,
      description: 'Espelho do item mestre (cadastro canônico em /products/items)',
      product_type: TIPO_TO_PRODUCT_TYPE[item.tipo],
      // Preço de venda mora em `ItemDetalheComercial`/tabela de preço por
      // cliente — o espelho nasce com 0 e o comercial define depois.
      price: 0,
      cost_price: item.custo_padrao ?? 0,
      quantity: 0,
      min_quantity: item.estoque_seguranca ?? 0,
      unit: item.unidade || 'un',
      lead_time: item.lead_time_dias ?? 0,
      status: item.status === 'INATIVO' ? 'inactive' : 'active',
    }, { transaction });
  }

  /**
   * Garante o item mestre gêmeo de um produto, na transação informada.
   *
   * @param {Object} product - Produto recém-criado/carregado.
   * @param {Object} transaction - Transação Sequelize ativa.
   * @returns {Promise<Object>} O item gêmeo (existente ou criado).
   */
  static async ensureItemMirrorForProduct(product: any, transaction: any): Promise<any> {
    const existing = await Item.findOne({ where: { codigo: product.code }, transaction });
    if (existing) return existing;

    return Item.create({
      codigo: product.code,
      descricao: product.name,
      tipo: mapProductTypeToItemTipo(product.product_type),
      unidade: product.unit || 'un',
      status: product.status === 'inactive' ? 'INATIVO' : 'ATIVO',
      estoque_atual: 0,
      estoque_reservado: 0,
      estoque_seguranca: product.min_quantity ?? 0,
      lote_minimo: 0,
      lead_time_dias: product.lead_time ?? 0,
      custo_padrao: product.cost_price ?? 0,
      fornecedor_padrao_id: null,
      conversao_automatica: false,
    }, { transaction });
  }

  /**
   * Propaga para o produto gêmeo as mudanças CADASTRAIS de um item
   * (sentido único item→produto). Saldos (`quantity`/`reserved_quantity`)
   * são deliberadamente ignorados: pertencem aos fluxos de estoque.
   *
   * @param {Object} item - Item já atualizado (estado final).
   * @param {Object} transaction - Transação Sequelize ativa.
   * @returns {Promise<Object|null>} Produto gêmeo atualizado, ou `null` se o
   *   item não tem código/tipo reconhecido.
   */
  static async syncProductMirrorFromItem(item: any, transaction: any): Promise<any | null> {
    if (!item?.codigo || !TIPO_TO_PRODUCT_TYPE[item.tipo]) return null;

    const product = await Product.findOne({ where: { code: item.codigo }, transaction });
    if (!product) {
      // Item produtivo pré-existente sem gêmeo (cadastro anterior a esta
      // correção): a atualização é a oportunidade de fechar o buraco.
      return this.ensureProductMirrorForItem(item, transaction);
    }

    return product.update({
      name: item.descricao,
      product_type: TIPO_TO_PRODUCT_TYPE[item.tipo],
      cost_price: item.custo_padrao ?? product.cost_price,
      unit: item.unidade || product.unit,
      lead_time: item.lead_time_dias ?? product.lead_time,
      status: item.status === 'INATIVO' ? 'inactive' : 'active',
    }, { transaction });
  }
}

export = ItemProductMirrorService;
