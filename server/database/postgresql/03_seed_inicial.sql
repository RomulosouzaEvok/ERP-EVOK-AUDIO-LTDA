-- 03_seed_inicial.sql
-- Seed minimo para validar BOM/MRP sem dados do ERP antigo.

BEGIN;

INSERT INTO usuarios (id, nome, email, senha_hash, papel)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Administrador Evok', 'admin@evokaudio.local', '$2a$10$replace-this-hash', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO fornecedores (id, razao_social, cnpj, email)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Fornecedor Inicial Isolado', '00000000000191', 'compras@fornecedor.local')
ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO items (
  id, codigo, descricao, tipo, unidade, estoque_atual, estoque_reservado,
  estoque_seguranca, lote_minimo, lead_time_dias, custo_padrao, fornecedor_padrao_id
)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'PA-AF12', 'Alto-falante 12 polegadas Evok', 'PRODUTO_ACABADO', 'UN', 0, 0, 0, 1, 2, 0, NULL),
  ('20000000-0000-0000-0000-000000000002', 'SUB-CONE12', 'Subconjunto cone 12 polegadas', 'SUBCONJUNTO', 'UN', 5, 0, 2, 5, 3, 12.500000, NULL),
  ('20000000-0000-0000-0000-000000000003', 'MP-FIO-COBRE', 'Fio de cobre esmaltado', 'MATERIA_PRIMA', 'KG', 12.750000, 1.250000, 5.000000, 10.000000, 7, 89.900000, '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'MP-COLA', 'Cola industrial para cone', 'MATERIA_PRIMA', 'KG', 3.250000, 0.000000, 1.000000, 5.000000, 5, 42.300000, '10000000-0000-0000-0000-000000000001')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO item_estruturas (
  item_pai_id, item_componente_id, quantidade, perda_percentual, nivel, sequencia, revisao, criado_por
)
VALUES
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 1.000000, 0.000000, 1, 10, '00', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 0.333333, 2.500000, 2, 20, '00', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 0.125000, 1.000000, 2, 30, '00', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (item_pai_id, item_componente_id, revisao) DO NOTHING;

COMMIT;
