-- Fase 4.7c: Validação de Backfill serial_numbers.item_id
-- Executar após backfill 04g com sucesso
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
FROM serial_numbers;

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
FROM serial_numbers sn
LEFT JOIN items ON sn.item_id = items.id
WHERE sn.item_id IS NOT NULL;

-- ============================================================================
-- BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id via crosswalk)
-- ============================================================================
\echo '=== BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id) ==='
WITH verificacao AS (
  SELECT
    sn.id,
    sn.product_id,
    sn.item_id,
    m.item_id as expected_item_id,
    CASE WHEN sn.item_id = m.item_id THEN 'OK' ELSE 'MISMATCH' END as status
  FROM serial_numbers sn
  LEFT JOIN migracao_product_item_map m ON sn.product_id = m.product_id
  WHERE sn.item_id IS NOT NULL
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
-- BLOCO 4: VERIFICAÇÃO DE NÚMEROS SERIAIS ÚNICOS POR ITEM_ID
-- ============================================================================
\echo '=== BLOCO 4: VERIFICAÇÃO DE NÚMEROS SERIAIS ÚNICOS POR ITEM_ID ==='
SELECT
  'sample_stats' as categoria,
  COUNT(DISTINCT item_id) as items_unicos,
  COUNT(*) as total_seriais,
  COUNT(DISTINCT serial_number) as seriais_unicos,
  ROUND(AVG(CASE WHEN item_id IS NOT NULL THEN 1 ELSE 0 END)::numeric * 100, 1) as pct_com_item,
  'PASS' as resultado
FROM serial_numbers
WHERE item_id IS NOT NULL;

-- ============================================================================
-- BLOCO 5: DISTRIBUIÇÃO POR STATUS DE SERIAL
-- ============================================================================
\echo '=== BLOCO 5: DISTRIBUIÇÃO POR STATUS DE SERIAL ==='
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
FROM serial_numbers
GROUP BY status
ORDER BY pct_backfilled DESC;

\echo '=== FIM DA VALIDAÇÃO ==='
COMMIT;
