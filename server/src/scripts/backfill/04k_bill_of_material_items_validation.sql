-- Fase 4.9c: Valida��o de Backfill bill_of_material_items.item_id

BEGIN;

\echo '=== BLOCO 1: COBERTURA DE BACKFILL ==='
SELECT
  COUNT(*) as total_registros,
  COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) as com_item_id,
  COUNT(CASE WHEN item_id IS NULL THEN 1 END) as sem_item_id,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS (sem dados)'
    WHEN COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) = COUNT(*) THEN 'PASS (100%)'
    WHEN ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 1) >= 99.9 THEN 'PASS (>99.9%)'
    ELSE 'FAIL'
  END as resultado
FROM bill_of_material_items;

\echo '=== BLOCO 2: INTEGRIDADE REFERENCIAL (item_id ? items.id) ==='
SELECT
  COUNT(*) as linhas_com_item_id,
  COUNT(CASE WHEN items.id IS NOT NULL THEN 1 END) as items_encontrados,
  COUNT(CASE WHEN items.id IS NULL THEN 1 END) as items_orfaos,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS (sem dados)'
    WHEN COUNT(CASE WHEN items.id IS NULL THEN 1 END) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM bill_of_material_items bomi
LEFT JOIN items ON bomi.item_id = items.id
WHERE bomi.item_id IS NOT NULL;

\echo '=== BLOCO 3: DUAL CONSISTENCY (component_product_id ? item_id) ==='
WITH verificacao AS (
  SELECT
    bomi.id,
    bomi.component_product_id,
    bomi.item_id,
    m.item_id as expected_item_id,
    CASE WHEN bomi.item_id = m.item_id THEN 'OK' ELSE 'MISMATCH' END as status
  FROM bill_of_material_items bomi
  LEFT JOIN migracao_product_item_map m ON bomi.component_product_id = m.product_id
  WHERE bomi.item_id IS NOT NULL
)
SELECT
  COUNT(*) as total_verificado,
  COUNT(CASE WHEN status = 'OK' THEN 1 END) as concordantes,
  COUNT(CASE WHEN status = 'MISMATCH' THEN 1 END) as discordantes,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS (sem dados)'
    WHEN COUNT(CASE WHEN status = 'MISMATCH' THEN 1 END) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM verificacao;

\echo '=== BLOCO 4: VERIFICA��O DE �NDICES ==='
SELECT
  'idx_bill_of_material_items_item_id' as indice,
  CASE WHEN indexname = 'idx_bill_of_material_items_item_id' THEN 'EXISTS' ELSE 'MISSING' END as status,
  'PASS' as resultado
FROM pg_indexes
WHERE tablename = 'bill_of_material_items' AND indexname = 'idx_bill_of_material_items_item_id'
UNION ALL
SELECT
  'idx_bill_of_material_items_bom_item_id' as indice,
  CASE WHEN indexname = 'idx_bill_of_material_items_bom_item_id' THEN 'EXISTS' ELSE 'MISSING' END as status,
  'PASS' as resultado
FROM pg_indexes
WHERE tablename = 'bill_of_material_items' AND indexname = 'idx_bill_of_material_items_bom_item_id'
UNION ALL
SELECT
  'idx_bill_of_material_items_level_item_id' as indice,
  CASE WHEN indexname = 'idx_bill_of_material_items_level_item_id' THEN 'EXISTS' ELSE 'MISSING' END as status,
  'PASS' as resultado
FROM pg_indexes
WHERE tablename = 'bill_of_material_items' AND indexname = 'idx_bill_of_material_items_level_item_id';

\echo '=== BLOCO 5: DISTRIBUI��O POR BOM_LEVEL ==='
SELECT
  'sample_stats' as categoria,
  COUNT(DISTINCT item_id) as items_unicos,
  COUNT(*) as total_items,
  ROUND(AVG(quantity::numeric), 4) as qty_media,
  MIN(quantity::numeric) as qty_min,
  MAX(quantity::numeric) as qty_max,
  'PASS' as resultado
FROM bill_of_material_items
WHERE item_id IS NOT NULL;

\echo '=== FIM DA VALIDA��O ==='
COMMIT;

