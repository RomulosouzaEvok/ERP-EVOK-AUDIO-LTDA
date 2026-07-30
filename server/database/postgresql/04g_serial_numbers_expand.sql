-- Fase 4.7a: Expand-Contract de serial_numbers
-- Adiciona coluna UUID item_id em paralelo com product_id (INTEGER legado)
-- Data: 2026-07-30
-- Objetivo: Preparar para migração gradual de product_id → item_id

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE serial_numbers
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índice para item_id (para queries futuras)
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item_id
  ON serial_numbers(item_id);

-- 3. Adicionar índice composto (para filtros combinados item + status)
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item_id_status
  ON serial_numbers(item_id, status);

-- 4. Adicionar índice composto (para queries de data + item)
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item_id_created_at
  ON serial_numbers(item_id, created_at DESC);

COMMIT;

-- Validação pós-alter
\echo '=== Verificando resultado do ALTER ==='
\d+ serial_numbers
