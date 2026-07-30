-- Fase 4.5a: Expand-Contract de production_lot_consumptions
-- Adiciona coluna UUID item_id em paralelo com product_id (INTEGER legado)
-- Data: 2026-07-30
-- Objetivo: Preparar para migração gradual de product_id → item_id

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE production_lot_consumptions
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índice para item_id (para queries futuras)
CREATE INDEX IF NOT EXISTS idx_production_lot_consumptions_item_id
  ON production_lot_consumptions(item_id);

-- 3. Adicionar índice composto (para filtros combinados item + production_order)
CREATE INDEX IF NOT EXISTS idx_production_lot_consumptions_item_id_order
  ON production_lot_consumptions(item_id, production_order_id);

-- 4. Adicionar índice composto (para queries de data + item)
CREATE INDEX IF NOT EXISTS idx_production_lot_consumptions_item_id_created_at
  ON production_lot_consumptions(item_id, created_at DESC);

COMMIT;

-- Validação pós-alter
\echo '=== Verificando resultado do ALTER ==='
\d+ production_lot_consumptions
