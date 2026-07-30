-- Fase 4.8a: Expand-Contract de production_routes
-- Adiciona coluna UUID item_id em paralelo com product_id (INTEGER legado)
-- Data: 2026-07-30
-- Objetivo: Preparar para migração gradual de product_id → item_id

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE production_routes
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índice para item_id (para queries futuras)
CREATE INDEX IF NOT EXISTS idx_production_routes_item_id
  ON production_routes(item_id);

-- 3. Adicionar índice composto (para filtros combinados item + status)
CREATE INDEX IF NOT EXISTS idx_production_routes_item_id_status
  ON production_routes(item_id, status);

-- 4. Adicionar índice composto (para queries de revisão + item)
CREATE INDEX IF NOT EXISTS idx_production_routes_item_id_revision
  ON production_routes(item_id, revision);

COMMIT;

-- Validação pós-alter
\echo '=== Verificando resultado do ALTER ==='
\d+ production_routes
