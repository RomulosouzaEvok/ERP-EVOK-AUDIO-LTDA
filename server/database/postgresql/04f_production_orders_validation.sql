-- Fase 4.4d: Validação pós-backfill de production_orders.item_id
-- Data: 2026-07-30
-- Objetivo: Garantir integridade expand-contract antes de dual-read ativo

BEGIN;

-- BLOCO 1: Verificar cobertura de mapeamento
\echo '=== BLOCO 1: Cobertura de Mapeamento ==='
WITH unmapped AS (
  SELECT COUNT(*) as cnt FROM production_orders
  WHERE item_id IS NULL AND product_id IS NOT NULL
)
SELECT
  CASE
    WHEN (SELECT cnt FROM unmapped) = 0 THEN '✅ OK: Todos os registros têm item_id ou product_id é NULL'
    ELSE '⚠️ ATENÇÃO: ' || (SELECT cnt FROM unmapped)::TEXT || ' registros sem item_id mapeado'
  END as cobertura_status;

-- BLOCO 2: Verificar unicidade de índices
\echo '=== BLOCO 2: Índices Necessários ==='
SELECT
  schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'production_orders'
  AND indexname IN (
    'idx_production_orders_item_id',
    'idx_production_orders_item_id_status',
    'idx_production_orders_item_id_created_at'
  )
ORDER BY indexname;

-- BLOCO 3: Validar relacionamentos com Item
\echo '=== BLOCO 3: Validação FK item_id → items ==='
WITH orphan_refs AS (
  SELECT COUNT(*) as cnt
  FROM production_orders po
  WHERE po.item_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM items i WHERE i.id = po.item_id)
)
SELECT
  CASE
    WHEN (SELECT cnt FROM orphan_refs) = 0 THEN '✅ OK: Todas as referências item_id são válidas'
    ELSE '❌ ERRO: ' || (SELECT cnt FROM orphan_refs)::TEXT || ' production_orders com item_id órfão'
  END as fk_validity;

-- BLOCO 4: Validar estado dual-read (product_id + item_id)
\echo '=== BLOCO 4: Estado Dual-Read ==='
SELECT
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) as com_product_id,
  COUNT(*) FILTER (WHERE item_id IS NOT NULL) as com_item_id,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL AND item_id IS NOT NULL) as ambos,
  COUNT(*) FILTER (WHERE item_id IS NULL) as sem_item_id,
  COUNT(*) as total
FROM production_orders;

-- BLOCO 5: Relatório de índices e performance
\echo '=== BLOCO 5: Índices Ativos ==='
SELECT
  schemaname, tablename, indexname,
  CASE
    WHEN indexname LIKE 'idx_production_orders%' THEN 'OPERACIONAL'
    ELSE 'LEGADO'
  END as tipo
FROM pg_indexes
WHERE tablename = 'production_orders'
  AND indexname NOT LIKE 'production_orders_pkey%'
ORDER BY tipo DESC, indexname;

COMMIT;

\echo '=== FIM DA VALIDAÇÃO (Fase 4.4d) ==='
