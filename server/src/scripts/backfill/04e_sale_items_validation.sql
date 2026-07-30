-- Fase 4.3c: Validação de Backfill sale_items.item_id

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
FROM sale_items;

\echo '=== BLOCO 2: INTEGRIDADE REFERENCIAL (item_id → items.id) ==='
SELECT
  COUNT(*) as linhas_com_item_id,
  COUNT(CASE WHEN items.id IS NOT NULL THEN 1 END) as items_encontrados,
  COUNT(CASE WHEN items.id IS NULL THEN 1 END) as items_orfaos,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS (sem dados)'
    WHEN COUNT(CASE WHEN items.id IS NULL THEN 1 END) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM sale_items si
LEFT JOIN items ON si.item_id = items.id
WHERE si.item_id IS NOT NULL;

\echo '=== BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id) ==='
WITH verificacao AS (
  SELECT
    si.id,
    si.product_id,
    si.item_id,
    m.item_id as expected_item_id,
    CASE WHEN si.item_id = m.item_id THEN 'OK' ELSE 'MISMATCH' END as status
  FROM sale_items si
  LEFT JOIN migracao_product_item_map m ON si.product_id = m.product_id
  WHERE si.item_id IS NOT NULL
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

\echo '=== BLOCO 4: VERIFICAÇÃO DE SOMAS POR ITEM_ID ==='
SELECT
  'sample_stats' as categoria,
  COUNT(DISTINCT item_id) as items_unicos,
  COUNT(*) as total_items,
  ROUND(AVG(quantity::numeric), 2) as qty_media,
  MIN(quantity::numeric) as qty_min,
  MAX(quantity::numeric) as qty_max,
  'PASS' as resultado
FROM sale_items
WHERE item_id IS NOT NULL;

\echo '=== BLOCO 5: DISTRIBUIÇÃO POR STATUS ==='
SELECT
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) as com_item_id,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 1)
  END as pct_backfilled,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS (sem dados)'
    WHEN ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 1) >= 99.9 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM sale_items
GROUP BY status
ORDER BY pct_backfilled DESC;

\echo '=== FIM DA VALIDAÇÃO ==='
COMMIT;
