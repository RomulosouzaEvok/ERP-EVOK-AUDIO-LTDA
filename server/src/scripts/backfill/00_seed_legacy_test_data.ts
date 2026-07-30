/**
 * Fase 0: Seed de dados legados fictícios (teste apenas)
 * SQL puro com valores hardcoded (seguro para dados de teste)
 */

import { sequelize } from '../../config/database';

async function seedLegacyTestData(): Promise<void> {
  console.log('\n🚀 INICIANDO SEED DE DADOS LEGADOS DE TESTE');
  console.log('⚠️ AVISO: DADOS FICTÍCIOS - validar pipeline apenas\n');

  const sql = `
-- Categorias
INSERT INTO product_categories (name, description, created_at, updated_at) VALUES
('Alto-Falantes', 'Drivers de áudio', now(), now()),
('Componentes', 'Partes montagem', now(), now()),
('Matéria-Prima', 'Insumos', now(), now());

-- Produtos (4 acabados + 3 semi + 3 componentes + 3 MP)
INSERT INTO products (code, name, category_id, product_type, price, cost_price, quantity, reserved_quantity, min_quantity, status, location, ncm, weight, unit, lead_time, ts_params_fs, ts_params_qms, created_at, updated_at) VALUES
('AF-001', 'Alto-Falante 8"', 1, 'finished', 450.00, 180.00, 100.0, 20.0, 10.0, 'active', 'A1', '85182100', 2.5, 'un', 7, 40.5, 0.38, now(), now()),
('AF-002', 'Alto-Falante 12"', 1, 'finished', 650.00, 260.00, 80.0, 15.0, 10.0, 'active', 'A2', '85182100', 4.2, 'un', 7, 35.0, 0.42, now(), now()),
('AF-003', 'Alto-Falante 15"', 1, 'finished', 890.00, 350.00, 50.0, 10.0, 5.0, 'active', 'A3', '85182100', 6.8, 'un', 14, 28.0, 0.40, now(), now()),
('AF-004', 'Alto-Falante 18" Limitado', 1, 'finished', 1200.00, 480.00, 20.0, 5.0, 3.0, 'inactive', 'A4', '85182100', 9.5, 'un', 21, 25.0, 0.45, now(), now()),
('SF-001', 'Bobina Alto-Falante', 2, 'semi_finished', 120.00, 48.00, 150.0, 30.0, 20.0, 'active', 'B1', '85182100', 0.8, 'un', 3, NULL, NULL, now(), now()),
('SF-002', 'Cone Papel', 2, 'semi_finished', 45.00, 18.00, 200.0, 50.0, 30.0, 'active', 'B2', '85182100', 0.3, 'un', 2, NULL, NULL, now(), now()),
('SF-003', 'Chassi Metálico', 2, 'semi_finished', 85.00, 34.00, 100.0, 20.0, 15.0, 'active', 'B3', '85182100', 1.2, 'un', 5, NULL, NULL, now(), now()),
('COMP-001', 'Imã Neodímio', 2, 'component', 25.00, 10.00, 500.0, 100.0, 100.0, 'active', 'C1', '85182100', 0.2, 'un', 30, NULL, NULL, now(), now()),
('COMP-002', 'Fio Esmaltado', 2, 'component', 35.00, 14.00, 250.0, 50.0, 50.0, 'active', 'C2', '85182100', 0.1, 'un', 10, NULL, NULL, now(), now()),
('COMP-003', 'Espuma Acústica', 2, 'component', 12.00, 4.80, 1000.0, 200.0, 200.0, 'active', 'C3', '85182100', 0.05, 'un', 1, NULL, NULL, now(), now()),
('MP-001', 'Papel Kraft 150g/m²', 3, 'raw_material', 15.00, 6.00, 5000.0, 1000.0, 1000.0, 'active', 'D1', '48025000', 0.15, 'kg', 7, NULL, NULL, now(), now()),
('MP-002', 'Resina Poliéster', 3, 'raw_material', 22.00, 8.80, 3000.0, 600.0, 600.0, 'active', 'D2', '39026000', 1.0, 'l', 5, NULL, NULL, now(), now()),
('MP-003', 'Aço SAE 1020', 3, 'raw_material', 45.00, 18.00, 2000.0, 400.0, 400.0, 'active', 'D3', '72160000', 7.5, 'kg', 3, NULL, NULL, now(), now());

-- BOMs
INSERT INTO bill_of_materials (product_id, revision, status, notes, total_components, total_cost, manufacturing_time_minutes, created_at, updated_at) VALUES
(1, '00', 'active', 'BOM padrão AF-001', 5, 450.00, 60, now(), now()),
(2, '00', 'draft', 'Em desenvolvimento AF-002', 2, 250.00, 90, now(), now()),
(3, '01', 'superseded', 'Descontinuada AF-003', 1, 100.00, 45, now(), now());

-- BOM Items (BOM 1)
INSERT INTO bill_of_material_items (bom_id, component_product_id, quantity, unit, bom_level, sequence_order, component_type, scrap_percentage, unit_cost, total_cost, is_critical, created_at, updated_at) VALUES
(1, 5, 1.0, 'un', 1, 1, 'semi_finished', 0.5, 48.00, 48.00, false, now(), now()),
(1, 6, 1.0, 'un', 1, 2, 'semi_finished', 0.5, 18.00, 18.00, false, now(), now()),
(1, 8, 1.0, 'un', 1, 3, 'component', 0.0, 10.00, 10.00, true, now(), now()),
(1, 9, 0.5, 'un', 1, 4, 'component', 1.0, 4.80, 2.40, false, now(), now()),
(1, 11, 0.2, 'kg', 1, 5, 'raw_material', 5.0, 6.00, 1.20, false, now(), now());

-- BOM Items (BOM 2 - com hierarquia)
-- Primeiro item nível 1 sem parent
INSERT INTO bill_of_material_items (bom_id, component_product_id, quantity, unit, bom_level, sequence_order, component_type, scrap_percentage, unit_cost, total_cost, created_at, updated_at) VALUES
(2, 5, 1.0, 'un', 1, 1, 'semi_finished', 0.5, 48.00, 48.00, now(), now());

-- Item nível 2 COM parent (nota: parent_item_id referencia o row acima, será o id retornado)
-- Por enquanto deixar NULL, será corrigido em segundo passo se necessário

-- BOM Items (BOM 3)
INSERT INTO bill_of_material_items (bom_id, component_product_id, quantity, unit, bom_level, sequence_order, component_type, scrap_percentage, unit_cost, total_cost, is_critical, created_at, updated_at) VALUES
(3, 7, 2.0, 'un', 1, 1, 'semi_finished', 1.0, 34.00, 68.00, true, now(), now());

-- Movimentos de estoque (teste para Fase 4.1)
INSERT INTO inventory_movements (product_id, user_id, type, quantity, unit_cost, description, reference_id, reference_type, created_at, updated_at) VALUES
(1, 1, 'in', 50.0, 180.00, 'Entrada de compra lote 001', NULL, 'purchase', now(), now()),
(1, 1, 'out', 10.0, 180.00, 'Saída venda SO-001', NULL, 'sale', now(), now()),
(1, 1, 'adjustment', 2.5, 180.00, 'Ajuste de perda em estoque', NULL, 'adjustment', now(), now()),
(2, 1, 'in', 30.0, 260.00, 'Entrada compra lote 002', NULL, 'purchase', now(), now()),
(2, 1, 'out', 5.0, 260.00, 'Saída venda SO-002', NULL, 'sale', now(), now()),
(3, 1, 'in', 20.0, 350.00, 'Entrada produção interna', NULL, 'production', now(), now()),
(3, 1, 'out', 3.0, 350.00, 'Saída produção OP-001', NULL, 'production', now(), now()),
(4, 1, 'adjustment', 1.0, 480.00, 'Contagem física diferença', NULL, 'adjustment', now(), now()),
(5, 1, 'in', 100.0, 48.00, 'Entrada componente semi', NULL, 'purchase', now(), now()),
(5, 1, 'out', 25.0, 48.00, 'Consumo produção lote A', NULL, 'production', now(), now()),
(6, 1, 'in', 150.0, 18.00, 'Entrada cone papel lote 003', NULL, 'purchase', now(), now()),
(7, 1, 'in', 50.0, 34.00, 'Entrada chassis lote 004', NULL, 'purchase', now(), now()),
(8, 1, 'in', 200.0, 10.00, 'Entrada imã neodímio', NULL, 'purchase', now(), now()),
(11, 1, 'in', 1000.0, 6.00, 'Entrada papel kraft', NULL, 'purchase', now(), now()),
(13, 1, 'in', 500.0, 18.00, 'Entrada aço SAE', NULL, 'purchase', now(), now());
`;

  try {
    await sequelize.query(sql);

    console.log('📝 Categorias inseridas');
    console.log('📦 13 produtos inseridos (4 acabados + 3 semi + 3 componentes + 3 MP)');
    console.log('📊 3 BOMs inseridas (1 active, 1 draft, 1 superseded)');

    console.log('\n' + '='.repeat(70));
    console.log('✅ SEED CONCLUÍDO COM SUCESSO');
    console.log('='.repeat(70));
    console.log('✓ Dados fictícios carregados');
    console.log('✓ 3 categorias criadas');
    console.log('✓ 13 produtos com tipos variados');
    console.log('✓ Alguns com Thiele-Small (ts_params_fs, ts_params_qms)');
    console.log('✓ 3 BOMs com status diferentes');
    console.log('\n📌 Próximo: Executar Fase 2B (backfill Product → Item)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedLegacyTestData();
}
