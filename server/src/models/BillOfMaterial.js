/**
 * 📦 Model: BillOfMaterial (BOM)
 * 
 * Representa a Estrutura do Produto (BOM - Bill of Materials) de um alto-falante.
 * Gerencia a lista de componentes, quantidades, níveis hierárquicos e roteiro de montagem.
 * 
 * @module models/BillOfMaterial
 * 
 * @description
 * Uma BOM define quais componentes (matéria-prima, subconjuntos, semi-acabados) 
 * compõem um produto acabado (ex: alto-falante de 12") ou subconjunto (ex: conjunto móvel).
 * 
 * **Regras de Negócio:**
 * - Um produto pode ter uma BOM própria (ex: alto-falante 12" modelo X)
 * - BOMs são versionadas (revision) para controle de engenharia
 * - Componentes podem ser de 3 tipos: 'raw_material', 'semi_finished', 'component'
 * - BOMs podem ser ativadas/inativadas (soft delete)
 * - A BOM base (parent_id = null) é a BOM master do produto
 * 
 * @example
 * // BOM de um Alto-Falante 12" Profissional
 * {
 *   productId: 1,          // Alto-Falante 12" Série PRO
 *   bomLevel: 0,           // Nível raiz
 *   bomItems: [
 *     { productId: 10, quantity: 1, unit: 'un', itemType: 'component', level: 1 },  // Carcaça
 *     { productId: 11, quantity: 1, unit: 'un', itemType: 'component', level: 1 },  // Cone
 *     { productId: 12, quantity: 1, unit: 'un', itemType: 'component', level: 1 },  // Bobina
 *     { productId: 13, quantity: 1, unit: 'un', itemType: 'component', level: 1 },  // Imã de Ferrite
 *     { productId: 14, quantity: 1, unit: 'un', itemType: 'component', level: 1 },  // Spider
 *     { productId: 15, quantity: 1, unit: 'un', itemType: 'component', level: 1 },  // Surround
 *     { productId: 16, quantity: 30, unit: 'g', itemType: 'raw_material', level: 2 }, // Cola especial
 *     { productId: 17, quantity: 4, unit: 'un', itemType: 'component', level: 1 },   // Terminal
 *   ]
 * }
 * 
 * @requires Product
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BillOfMaterial = sequelize.define('BillOfMaterial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Identificador único da BOM'
  },
  
  // === PRODUTO ASSOCIADO ===
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK → Product.id. Produto acabado ou subconjunto ao qual esta BOM pertence'
  },

  // === VERSIONAMENTO DE ENGENHARIA ===
  revision: {
    type: DataTypes.STRING(10),
    defaultValue: '00',
    comment: 'Revisão da BOM. Controla versões de engenharia (00, 01, A, B...)'
  },
  revision_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    comment: 'Data de aprovação/efetivação desta revisão'
  },
  revision_notes: {
    type: DataTypes.TEXT,
    comment: 'Notas de alteração desta revisão (ex: "Substituído imã Ferrite Y30 por Y35")'
  },

  // === STATUS ===
  status: {
    type: DataTypes.ENUM('draft', 'active', 'inactive', 'superseded'),
    defaultValue: 'draft',
    comment: 'Status da BOM: draft=em elaboração, active=vigente, inactive=desativada, superseded=substituída por revisão nova'
  },

  // === RASTREABILIDADE ===
  created_by: {
    type: DataTypes.INTEGER,
    comment: 'FK → User.id. Usuário que criou/registrou esta BOM'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    comment: 'FK → User.id. Usuário que aprovou esta BOM (engenharia)'
  },
  approval_date: {
    type: DataTypes.DATEONLY,
    comment: 'Data de aprovação oficial pela engenharia'
  },

  // === OBSERVAÇÕES TÉCNICAS ===
  notes: {
    type: DataTypes.TEXT,
    comment: 'Observações técnicas gerais da BOM (ex: "Utilizar cola X em temperatura ambiente")'
  },

  // === METADADOS DO PROCESSO ===
  total_components: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cache: total de itens distintos na BOM (calculado automático)'
  },
  total_cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Cache: custo total calculado da BOM (soma dos componentes x quantidade)'
  },
  manufacturing_time_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cache: tempo total estimado de fabricação em minutos (somado dos roteiros)'
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
  tableName: 'bill_of_materials',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'], name: 'idx_bom_product' },
    { fields: ['status'], name: 'idx_bom_status' },
    { fields: ['product_id', 'status'], name: 'idx_bom_product_active' }
  ],
  comment: 'Tabela de Estrutura de Produto (BOM) - Define a composição de alto-falantes e subconjuntos'
});

module.exports = BillOfMaterial;
