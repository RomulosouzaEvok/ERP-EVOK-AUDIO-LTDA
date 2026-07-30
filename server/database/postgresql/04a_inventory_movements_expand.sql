-- Fase 4.1a: Expand-Contract de inventory_movements
-- Adiciona coluna UUID item_id em paralelo com product_id (INTEGER legado)
-- Data: 2026-07-30
-- Objetivo: Preparar para migração gradual de product_id → item_id

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índice para item_id (para queries futuras)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id
  ON inventory_movements(item_id);

-- 3. Adicionar índice composto (para filtros combinados item + type)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id_type
  ON inventory_movements(item_id, type);

-- 4. Adicionar índice composto (para queries de data + item)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id_created_at
  ON inventory_movements(item_id, created_at DESC);

-- 5. Registrar status de alter na auditoria (se tabela exists)
-- Comentado: reativar se schema_migration_log existir
-- INSERT INTO schema_migration_log (version, description, status, applied_at)
-- VALUES ('4.1a', 'Expand: adicionar item_id UUID a inventory_movements', 'PENDING_BACKFILL', now())
-- ON CONFLICT DO NOTHING;

COMMIT;

-- Validação pós-alter
\echo '=== Verificando resultado do ALTER ==='
\d+ inventory_movements
