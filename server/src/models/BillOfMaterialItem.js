/**
 * 📦 Model: BillOfMaterialItem (Item da BOM)
 * 
 * Representa um item componente dentro da Estrutura do Produto (BOM).
 * Cada item define: qual produto/insumo, quantidade, nível hierárquico e custo.
 * 
 * @module models/BillOfMaterialItem
 * 
 * @description
 * Uma BOM é composta por vários itens. Cada item representa um componente,
 * matéria-prima, subconjunto ou semi-acabado necessário para fabricar o produto pai.
 * 
 * **Hierarquia de Níveis (bom_level):**
 * - Nível 0: Produto acabado (ex: Alto-falante 12")
 * - Nível 1: Subconjuntos e componentes diretos (ex: Carcaça, Cone, Bobina, Imã)
 * - Nível 2: Subcomponentes (ex: Fio de cobre da bobina, Papel do cone)
 * - Nível 3+: Detalhamento adicional conforme necessário
 * 
 * **Exemplo Prático (Alto-falante 12" Profissional):**
 * ```
 * NÍVEL 0: Alto-falante 12" PRO (produto_id = 1)
 *   ├── NÍVEL 1: Carcaça (produto_id = 10) - 1 un
 *   ├── NÍVEL 1: Conjunto Móvel (produto_id = 11) - 1 un  ← Subconjunto (tem própria BOM)
 *   │   ├── NÍVEL 2: Cone de papel (produto_id = 20) - 1 un
 *   │   ├── NÍVEL 2: Bobina (produto_id = 21) - 1 un
 *   │   │   ├── NÍVEL 3: Fio de cobre (produto_id = 30) - 50g
 *   │   │   └── NÍVEL 3: Tubete (produto_id = 31) - 1 un
 *   │   ├── NÍVEL 2: Spider (produto_id = 22) - 1 un
 *   │   └── NÍVEL 2: Surround (produto_id = 23) - 1 un
 *   ├── NÍVEL 1: Imã Ferrite (produto_id = 12) - 1 un
 *   ├── NÍVEL 1: Terminal (produto_id = 13) - 2 un
 *   └── NÍVEL 1: Cola (produto_id = 14) - 30g
 * ```
 * 
 * @requires BillOfMaterial
 * @requires Product
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BillOfMaterialItem = sequelize.define('BillOfMaterialItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Identificador único do item da BOM'
  },

  // === VINCULO COM BOM ===
  bom_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK → bill_of_materials.id. BOM à qual este item pertence'
  },

  // === PRODUTO COMPONENTE ===
  component_product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK → Product.id. O produto/insumo que é componente (pode ser matéria-prima, subconjunto, etc.)'
  },

  // === QUANTIDADE E UNIDADE ===
  quantity: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0.0001,
      isPositive(value) {
        if (parseFloat(value) <= 0) {
          throw new Error('Quantidade do componente deve ser maior que zero');
        }
      }
    },
    comment: 'Quantidade do componente necessária para produzir UMA unidade do produto pai'
  },
  unit: {
    type: DataTypes.STRING(10),
    defaultValue: 'un',
    comment: 'Unidade de medida (un=unidade, g=gramas, m=metros, kg=quilogramas, l=litros)'
  },

  // === HIERARQUIA ===
  bom_level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 0,
      max: 10
    },
    comment: 'Nível hierárquico do componente na árvore da BOM (0=produto final, 1=componente direto, 2=subcomponente, etc.)'
  },
  parent_item_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    comment: 'FK → bill_of_material_items.id. Auto-relacionamento: item pai se este for subcomponente de outro item'
  },

  // === POSIÇÃO NO ROTEIRO ===
  sequence_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Ordem de montagem/inserção no processo produtivo (0=primeiro a ser montado)'
  },

  // === TIPO DO COMPONENTE ===
  component_type: {
    type: DataTypes.ENUM('raw_material', 'component', 'semi_finished', 'packaging', 'consumable', 'other'),
    defaultValue: 'component',
    comment: 'Classificação do tipo de componente para cálculo de custos e MRP'
  },

  // === PERDA TÉCNICA (REFUGO) ===
  scrap_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'Percentual de perda técnica esperada no processo (ex: 3.5% de refugo na bobinagem). Usado no MRP para calcular necessidade real.'
  },

  // === CUSTOS (CACHE PARA PERFORMANCE) ===
  unit_cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Cache: custo unitário do componente no momento da criação/atualização da BOM'
  },
  total_cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Cache: custo total calculado (quantidade * unit_cost) incluindo perda (scrap)'
  },

  // === METADADOS ===
  notes: {
    type: DataTypes.TEXT,
    comment: 'Observações específicas deste item (ex: "Fornecedor alternativo: XYZ", "Aplicar cola em camada fina")'
  },
  alternative_product_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    comment: 'FK → Product.id. Produto substituto aprovado pela engenharia (para evitar falta de estoque)'
  },
  is_critical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se TRUE, este item é crítico (único fornecedor, lead time longo, etc.). Alerta no MRP.'
  },

  // === TIMESTAMPS ===
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    comment: 'Data de criação do registro'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    comment: 'Data da última atualização'
  }
}, {
  tableName: 'bill_of_material_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['bom_id'], name: 'idx_bom_item_bom' },
    { fields: ['component_product_id'], name: 'idx_bom_item_component' },
    { fields: ['bom_id', 'bom_level'], name: 'idx_bom_item_level' },
    { fields: ['parent_item_id'], name: 'idx_bom_item_parent' }
  ],
  comment: 'Tabela de Itens da Estrutura de Produto (BOM) - Componentes, quantidades e hierarquia'
});

module.exports = BillOfMaterialItem;
