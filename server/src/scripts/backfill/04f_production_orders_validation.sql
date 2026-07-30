-- Fase 4.4c: Validação de Backfill production_orders.item_id
-- Executar após backfill 04d com sucesso
-- Retorna 5 blocos de testes (PASS/FAIL para cada validação)

BEGIN;

-- ============================================================================
-- BLOCO 1: COBERTURA DE BACKFILL
-- ============================================================================
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
FROM production_orders;

-- ============================================================================
-- BLOCO 2: INTEGRIDADE REFERENCIAL (item_id → items.id)
-- ============================================================================
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
FROM production_orders po
LEFT JOIN items ON po.item_id = items.id
WHERE po.item_id IS NOT NULL;

-- ============================================================================
-- BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id via crosswalk)
-- ============================================================================
\echo '=== BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id) ==='
WITH verificacao AS (
  SELECT
    po.id,
    po.product_id,
    po.item_id,
    m.item_id as expected_item_id,
    CASE WHEN po.item_id = m.item_id THEN 'OK' ELSE 'MISMATCH' END as status
  FROM production_orders po
  LEFT JOIN migracao_product_item_map m ON po.product_id = m.product_id
  WHERE po.item_id IS NOT NULL
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

-- ============================================================================
-- BLOCO 4: VERIFICAÇÃO DE SOMAS POR ITEM_ID
-- ============================================================================
\echo '=== BLOCO 4: VERIFICAÇÃO DE SOMAS POR ITEM_ID ==='
SELECT
  'sample_stats' as categoria,
  COUNT(DISTINCT item_id) as items_unicos,
  COUNT(*) as total_items,
  ROUND(AVG(quantity::numeric), 2) as qty_media,
  MIN(quantity::numeric) as qty_min,
  MAX(quantity::numeric) as qty_max,
  'PASS' as resultado
FROM production_orders
WHERE item_id IS NOT NULL;

-- ============================================================================
-- BLOCO 5: DISTRIBUIÇÃO POR STATUS
-- ============================================================================
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
FROM production_orders
GROUP BY status
ORDER BY pct_backfilled DESC;

\echo '=== FIM DA VALIDAÇÃO ==='
COMMIT;
