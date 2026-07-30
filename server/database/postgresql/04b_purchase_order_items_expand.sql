-- Fase 4.2: Expand-Contract de purchase_order_items
-- Adicionar item_id UUID em paralelo ao product_id INTEGER

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índices
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id
  ON purchase_order_items(item_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id_purchase_id
  ON purchase_order_items(item_id, purchase_id);

-- 3. Índice de data para queries históricas
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id_created_at
  ON purchase_order_items(item_id, created_at DESC);

COMMIT;
