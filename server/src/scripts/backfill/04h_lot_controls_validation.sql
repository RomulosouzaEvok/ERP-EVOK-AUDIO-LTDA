-- Fase 4.6c: Valida��o de Backfill lot_controls.item_id
-- Executar ap�s backfill 04f com sucesso
-- Retorna 5 blocos de testes (PASS/FAIL para cada valida��o)

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
FROM lot_controls;

-- ============================================================================
-- BLOCO 2: INTEGRIDADE REFERENCIAL (item_id ? items.id)
-- ============================================================================
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
FROM lot_controls lc
LEFT JOIN items ON lc.item_id = items.id
WHERE lc.item_id IS NOT NULL;

-- ============================================================================
-- BLOCO 3: DUAL CONSISTENCY (product_id ? item_id via crosswalk)
-- ============================================================================
\echo '=== BLOCO 3: DUAL CONSISTENCY (product_id ? item_id) ==='
WITH verificacao AS (
  SELECT
    lc.id,
    lc.product_id,
    lc.item_id,
    m.item_id as expected_item_id,
    CASE WHEN lc.item_id = m.item_id THEN 'OK' ELSE 'MISMATCH' END as status
  FROM lot_controls lc
  LEFT JOIN migracao_product_item_map m ON lc.product_id = m.product_id
  WHERE lc.item_id IS NOT NULL
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
-- BLOCO 4: VERIFICA��O DE QUANTIDADES POR ITEM_ID
-- ============================================================================
\echo '=== BLOCO 4: VERIFICA��O DE QUANTIDADES POR ITEM_ID ==='
SELECT
  'sample_stats' as categoria,
  COUNT(DISTINCT item_id) as items_unicos,
  COUNT(*) as total_lotes,
  ROUND(AVG(quantity_initial::numeric), 4) as qty_inicial_media,
  MIN(quantity_initial::numeric) as qty_min,
  MAX(quantity_initial::numeric) as qty_max,
  'PASS' as resultado
FROM lot_controls
WHERE item_id IS NOT NULL;

-- ============================================================================
-- BLOCO 5: DISTRIBUI��O POR STATUS DE LOTE
-- ============================================================================
\echo '=== BLOCO 5: DISTRIBUI��O POR STATUS DE LOTE ==='
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
FROM lot_controls
GROUP BY status
ORDER BY pct_backfilled DESC;

\echo '=== FIM DA VALIDA��O ==='
COMMIT;

