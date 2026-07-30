-- Fase 4.3: Expand-Contract de sale_items
-- Adicionar item_id UUID em paralelo ao product_id INTEGER

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índices
CREATE INDEX IF NOT EXISTS idx_sale_items_item_id
  ON sale_items(item_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_item_id_sale_id
  ON sale_items(item_id, sale_id);

-- 3. Índice de data para queries históricas
CREATE INDEX IF NOT EXISTS idx_sale_items_item_id_created_at
  ON sale_items(item_id, created_at DESC);

COMMIT;
