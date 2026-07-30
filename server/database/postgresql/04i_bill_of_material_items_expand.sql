-- Fase 4.9a: Expand-Contract de bill_of_material_items
-- Adiciona coluna UUID item_id em paralelo com component_product_id (INTEGER legado)
-- Data: 2026-07-30
-- Objetivo: Preparar para migração gradual de component_product_id → item_id

BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE bill_of_material_items
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índice para item_id (para queries futuras)
CREATE INDEX IF NOT EXISTS idx_bill_of_material_items_item_id
  ON bill_of_material_items(item_id);

-- 3. Adicionar índice composto (para filtros combinados bom + item)
CREATE INDEX IF NOT EXISTS idx_bill_of_material_items_bom_item_id
  ON bill_of_material_items(bom_id, item_id);

-- 4. Adicionar índice composto (para queries de nível + item)
CREATE INDEX IF NOT EXISTS idx_bill_of_material_items_level_item_id
  ON bill_of_material_items(bom_level, item_id);

COMMIT;

-- Validação pós-alter
\echo '=== Verificando resultado do ALTER ==='
\d+ bill_of_material_items
