-- 02_indexes.sql
-- Indices estrategicos para BOM multinivel, MRP e rastreabilidade.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_items_tipo_status ON items (tipo, status);
CREATE INDEX IF NOT EXISTS idx_items_codigo_trgm_like ON items (codigo text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_item_estruturas_pai_ativo ON item_estruturas (item_pai_id, ativo, revisao);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_componente_ativo ON item_estruturas (item_componente_id, ativo);
CREATE INDEX IF NOT EXISTS idx_item_estruturas_arvore ON item_estruturas (item_pai_id, item_componente_id, nivel, sequencia);

CREATE INDEX IF NOT EXISTS idx_movimentos_item_data ON movimentos_estoque (item_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_movimentos_origem ON movimentos_estoque (origem_tabela, origem_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_lote ON movimentos_estoque (lote_id) WHERE lote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lotes_item_codigo ON lotes (item_id, codigo_lote);
CREATE INDEX IF NOT EXISTS idx_serial_item_status ON numeros_serie (item_id, status);

CREATE INDEX IF NOT EXISTS idx_requisicoes_status_data ON requisicoes_compra (status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_requisicao_items_item_data ON requisicao_compra_items (item_id, data_necessidade);

CREATE INDEX IF NOT EXISTS idx_nf_fornecedor_data ON entradas_nf (fornecedor_id, recebido_em DESC);
CREATE INDEX IF NOT EXISTS idx_nf_items_item ON entradas_nf_items (item_id);

CREATE INDEX IF NOT EXISTS idx_op_item_status ON ordens_producao (item_id, status);
CREATE INDEX IF NOT EXISTS idx_op_periodo ON ordens_producao (data_inicio, data_fim);

CREATE INDEX IF NOT EXISTS idx_mrp_item_data ON mrp_ordens_planejadas (item_id, data_necessidade, status);
CREATE INDEX IF NOT EXISTS idx_mrp_liberacao ON mrp_ordens_planejadas (data_liberacao, status);

CREATE INDEX IF NOT EXISTS idx_webhooks_evento_status ON webhooks_eventos (provedor, evento, status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_payload_gin ON webhooks_eventos USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria_eventos (entidade, entidade_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_correlation ON auditoria_eventos (correlation_id);

COMMIT;
