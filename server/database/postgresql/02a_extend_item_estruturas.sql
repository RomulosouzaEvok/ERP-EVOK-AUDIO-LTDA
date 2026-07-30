-- 02a_extend_item_estruturas.sql
-- Fase 2A: Estender ItemEstrutura com workflow, custo, hierarquia e metadados
-- Antes de executar backfill de BOM (Fase 2B/2C)
--
-- Mudanças:
-- - Criar ENUM tipos para status e component_type
-- - ADD 9 colunas a item_estruturas
-- - Criar índices para performance pós-backfill
-- - Criar tabelas de suporte: migracao_product_item_map, migracao_bom_log

BEGIN;

-- Criar ENUMs se ainda não existirem
CREATE TYPE IF NOT EXISTS item_estrutura_status AS ENUM ('draft', 'active', 'inactive', 'superseded');
CREATE TYPE IF NOT EXISTS item_estrutura_component_type AS ENUM ('raw_material', 'component', 'semi_finished', 'packaging', 'consumable', 'other');

-- ALTER TABLE: Adicionar 9 novos campos
ALTER TABLE item_estruturas
ADD COLUMN IF NOT EXISTS status item_estrutura_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_date DATE,
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18, 6) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(18, 6) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_item_estrutura_id UUID REFERENCES item_estruturas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS component_type item_estrutura_component_type NOT NULL DEFAULT 'component',
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alternative_product_id UUID;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_item_estruturas_status ON item_estruturas(status);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_approved_by ON item_estruturas(approved_by);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_parent_item ON item_estruturas(parent_item_estrutura_id);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_component_type ON item_estruturas(component_type);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_is_critical ON item_estruturas(is_critical);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_parent_sequencia ON item_estruturas(parent_item_estrutura_id, sequencia);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_pai_status ON item_estruturas(item_pai_id, status);

-- Criar tabela de crosswalk: Product (legado) → Item (novo)
-- Usada durante Fase 2B (backfill Product) e Fase 2C (backfill BOM)
CREATE TABLE IF NOT EXISTS migracao_product_item_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INT NOT NULL UNIQUE,
  item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  mapeado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(40) NOT NULL DEFAULT 'SUCESSO',
  observacoes TEXT
);
CREATE INDEX IF NOT EXISTS idx_migracao_product_id ON migracao_product_item_map(product_id);
CREATE INDEX IF NOT EXISTS idx_migracao_item_id ON migracao_product_item_map(item_id);

-- Criar tabela de log para auditoria de backfill BOM
-- Rastreia cada BillOfMaterialItem → ItemEstrutura
CREATE TABLE IF NOT EXISTS migracao_bom_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_of_material_id INT,
  bill_of_material_item_id INT,
  item_estrutura_id UUID REFERENCES item_estruturas(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  mensagem_erro TEXT,
  processado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_migracao_bom_status ON migracao_bom_log(status);
CREATE INDEX IF NOT EXISTS idx_migracao_bom_item_estrutura ON migracao_bom_log(item_estrutura_id);

COMMIT;
