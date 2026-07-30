-- Fase 2D: Validação Pós-Backfill
-- Queries SQL de validação para verificar integridade da migração Product/BOM → Item/ItemEstrutura
-- Status: read-only (sem alterações de dados)

-- ============================================================================
-- 1. VALIDAÇÃO DE CONTAGEM: Product → Item
-- ============================================================================

-- Contar produtos migrados
SELECT
  COUNT(DISTINCT p.id) as total_products,
  COUNT(DISTINCT m.item_id) as migrated_items,
  COUNT(DISTINCT CASE WHEN m.status = 'SUCESSO' THEN m.item_id END) as successful_migrations,
  COUNT(DISTINCT CASE WHEN m.status = 'ERRO' THEN m.product_id END) as failed_migrations
FROM products p
LEFT JOIN migracao_product_item_map m ON p.id = m.product_id;

-- Produtos SEM Item mapeado (órfãos)
SELECT p.id, p.code, p.name, COUNT(*) as count
FROM products p
LEFT JOIN migracao_product_item_map m ON p.id = m.product_id
WHERE m.item_id IS NULL
GROUP BY p.id, p.code, p.name
ORDER BY p.id;

-- ============================================================================
-- 2. VALIDAÇÃO DE CONTAGEM: BOM → ItemEstrutura
-- ============================================================================

-- Contar BOMs migradas
SELECT
  COUNT(DISTINCT b.id) as total_boms,
  COUNT(DISTINCT CASE WHEN l.status = 'SUCESSO' THEN l.bill_of_material_id END) as successful_boms,
  COUNT(DISTINCT CASE WHEN l.status = 'ERRO' THEN l.bill_of_material_id END) as failed_boms,
  COUNT(DISTINCT ie.id) as item_estruturas_created
FROM bill_of_materials b
LEFT JOIN migracao_bom_log l ON b.id = l.bill_of_material_id
LEFT JOIN item_estruturas ie ON l.item_estrutura_id = ie.id;

-- BOMs com falha (detalhes do erro)
SELECT
  l.bill_of_material_id,
  l.status,
  COUNT(*) as erro_count,
  STRING_AGG(DISTINCT l.mensagem_erro, '; ') as erros
FROM migracao_bom_log l
WHERE l.status IN ('ERRO', 'SKIP')
GROUP BY l.bill_of_material_id, l.status
ORDER BY l.bill_of_material_id;

-- ============================================================================
-- 3. VALIDAÇÃO DE SOMAS: Quantidade e Custo
-- ============================================================================

-- Comparar somas de quantidade (amostragem: produto com maior BOM)
WITH top_product AS (
  SELECT p.id as product_id
  FROM products p
  LEFT JOIN migracao_product_item_map m ON p.id = m.product_id
  WHERE m.item_id IS NOT NULL
  ORDER BY p.id
  LIMIT 1
),
legado_totals AS (
  SELECT
    SUM(bmi.quantity) as total_qty_legado,
    SUM(bmi.total_cost) as total_cost_legado
  FROM bill_of_materials b
  JOIN bill_of_material_items bmi ON b.id = bmi.bom_id
  JOIN top_product tp ON b.product_id = tp.product_id
),
novo_totals AS (
  SELECT
    SUM(ie.quantidade::numeric) as total_qty_novo,
    SUM(ie.total_cost::numeric) as total_cost_novo
  FROM item_estruturas ie
  JOIN migracao_product_item_map m ON ie.item_pai_id = m.item_id
  JOIN top_product tp ON m.product_id = tp.product_id
)
SELECT
  lt.total_qty_legado,
  nt.total_qty_novo,
  lt.total_cost_legado,
  nt.total_cost_novo,
  (lt.total_qty_legado - nt.total_qty_novo) as qty_diff,
  (lt.total_cost_legado - nt.total_cost_novo) as cost_diff
FROM legado_totals lt
CROSS JOIN novo_totals nt;

-- ============================================================================
-- 4. VALIDAÇÃO DE NULL: Campos obrigatórios
-- ============================================================================

-- Verificar NULLs inesperados em Item
SELECT
  COUNT(*) FILTER (WHERE codigo IS NULL) as null_codigo,
  COUNT(*) FILTER (WHERE descricao IS NULL) as null_descricao,
  COUNT(*) FILTER (WHERE tipo IS NULL) as null_tipo,
  COUNT(*) FILTER (WHERE unidade IS NULL) as null_unidade,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status,
  COUNT(*) as total_items
FROM items;

-- Verificar NULLs inesperados em ItemDetalheComercial
SELECT
  COUNT(*) FILTER (WHERE preco_venda IS NULL) as null_preco,
  COUNT(*) FILTER (WHERE ncm IS NULL) as null_ncm,
  COUNT(*) FILTER (WHERE peso_kg IS NULL) as null_peso,
  COUNT(*) as total_details
FROM item_detalhes_comerciais;

-- Verificar NULLs inesperados em ItemEstrutura
SELECT
  COUNT(*) FILTER (WHERE item_pai_id IS NULL) as null_item_pai,
  COUNT(*) FILTER (WHERE item_componente_id IS NULL) as null_item_componente,
  COUNT(*) FILTER (WHERE quantidade IS NULL) as null_quantidade,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status,
  COUNT(*) as total_estruturas
FROM item_estruturas;

-- ============================================================================
-- 5. VALIDAÇÃO DE INTEGRIDADE: Referências órfãs
-- ============================================================================

-- ItemEstrutura com item_pai_id inexistente
SELECT ie.id, ie.item_pai_id, ie.item_componente_id
FROM item_estruturas ie
LEFT JOIN items i ON ie.item_pai_id = i.id
WHERE i.id IS NULL
LIMIT 100;

-- ItemEstrutura com item_componente_id inexistente
SELECT ie.id, ie.item_pai_id, ie.item_componente_id
FROM item_estruturas ie
LEFT JOIN items i ON ie.item_componente_id = i.id
WHERE i.id IS NULL
LIMIT 100;

-- ItemDetalheComercial com item_id inexistente
SELECT idc.item_id
FROM item_detalhes_comerciais idc
LEFT JOIN items i ON idc.item_id = i.id
WHERE i.id IS NULL
LIMIT 100;

-- ============================================================================
-- 6. VALIDAÇÃO DE HIERARQUIA: Ciclos em ItemEstrutura
-- ============================================================================

-- Detectar ciclos (auto-referência indireta via parent_item_estrutura_id)
WITH RECURSIVE ciclos AS (
  -- Anchora: todo parent_item_estrutura_id
  SELECT id, parent_item_estrutura_id, 1 as depth
  FROM item_estruturas
  WHERE parent_item_estrutura_id IS NOT NULL

  UNION ALL

  -- Recursão: seguir parent_item_estrutura_id
  SELECT c.id, ie.parent_item_estrutura_id, c.depth + 1
  FROM ciclos c
  JOIN item_estruturas ie ON c.parent_item_estrutura_id = ie.id
  WHERE c.depth < 100 -- Limite de profundidade para evitar loop infinito
)
SELECT DISTINCT id
FROM ciclos
WHERE depth > 50 -- Flag: profundidade suspeita
LIMIT 100;

-- ============================================================================
-- 7. VALIDAÇÃO DE TIPOS: Inferência de component_type
-- ============================================================================

-- Verificar distribuição de component_type na nova camada
SELECT
  component_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM item_estruturas
GROUP BY component_type
ORDER BY count DESC;

-- Comparar com distribuição legada (BOMItem.component_type)
SELECT
  component_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM bill_of_material_items
GROUP BY component_type
ORDER BY count DESC;

-- ============================================================================
-- 8. RESUMO EXECUTIVO
-- ============================================================================

SELECT
  'Fase 2B (Product → Item)' as fase,
  COUNT(DISTINCT p.id) as entities_legadas,
  COUNT(DISTINCT m.item_id) as entities_novas,
  CASE
    WHEN COUNT(DISTINCT p.id) = COUNT(DISTINCT m.item_id) THEN '✅ COMPLETA'
    ELSE '⚠️ INCOMPLETA'
  END as status
FROM products p
LEFT JOIN migracao_product_item_map m ON p.id = m.product_id

UNION ALL

SELECT
  'Fase 2C (BOM → ItemEstrutura)' as fase,
  COUNT(DISTINCT b.id) as entities_legadas,
  COUNT(DISTINCT ie.id) as entities_novas,
  CASE
    WHEN COUNT(DISTINCT b.id) = COUNT(DISTINCT ie.item_pai_id) THEN '✅ COMPLETA'
    ELSE '⚠️ INCOMPLETA'
  END as status
FROM bill_of_materials b
LEFT JOIN item_estruturas ie ON b.product_id = (
  SELECT m.product_id FROM migracao_product_item_map m WHERE m.item_id = ie.item_pai_id LIMIT 1
);
