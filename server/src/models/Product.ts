/**
 * 📦 Model: Product (Produtos)
 *
 * @module models/Product
 *
 * Entidade central do ERP. Representa todo item do inventário:
 * PRODUTO_ACABADO (finished), SUBCONJUNTO (semi_finished),
 * COMPONENTE (component) ou MATERIA_PRIMA (raw_material).
 *
 * Inclui parâmetros Thiele-Small específicos para alto-falantes.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductAttributes {
  id: number;
  name: string;
  code: string;
  description: string;
  category_id: number | null;
  price: number;
  cost_price: number;
  quantity: number;
  reserved_quantity: number;
  min_quantity: number;
  status: 'active' | 'inactive';
  location: string;
  product_type: 'finished' | 'semi_finished' | 'component' | 'raw_material';
  ncm: string;
  cest: string | null;
  weight: number;
  unit: string;
  lead_time: number;
  drawing_number: string | null;
  revision: string;
  lot_number: string | null;
  serial_number: string | null;
  // Thiele-Small parameters
  ts_params_fs: number | null;
  ts_params_qms: number | null;
  ts_params_qes: number | null;
  ts_params_qts: number | null;
  ts_params_vas: number | null;
  ts_params_sd: number | null;
  ts_params_xmax: number | null;
  ts_params_re: number | null;
  ts_params_le: number | null;
  ts_params_bl: number | null;
  ts_params_mms: number | null;
  ts_params_cms: number | null;
  ts_params_spl: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome do produto' },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: 'Código/SKU único' },
  description: { type: DataTypes.TEXT, defaultValue: '', comment: 'Descrição detalhada' },
  category_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → product_categories.id' },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: 'Preço de venda' },
  cost_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, comment: 'Preço de custo' },
  quantity: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0, comment: 'Estoque atual' },
  reserved_quantity: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0, comment: 'Estoque reservado para pedidos/OPs' },
  min_quantity: { type: DataTypes.DECIMAL(18, 6), defaultValue: 5, comment: 'Estoque mínimo para alerta' },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active', comment: 'Status do produto' },
  location: { type: DataTypes.STRING(100), defaultValue: '', comment: 'Localização física no estoque' },
  product_type: { type: DataTypes.ENUM('finished', 'semi_finished', 'component', 'raw_material'), defaultValue: 'finished', comment: 'Tipo: acabado, subconjunto, componente ou matéria-prima' },
  ncm: { type: DataTypes.STRING(10), defaultValue: '85182100', comment: 'Nomenclatura Comum do Mercosul' },
  cest: DataTypes.STRING(10),
  weight: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0, comment: 'Peso em kg' },
  unit: { type: DataTypes.STRING(10), defaultValue: 'un', comment: 'Unidade de medida' },
  lead_time: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Lead time em dias' },
  drawing_number: DataTypes.STRING(50),
  lot_number: { type: DataTypes.STRING(50), allowNull: true, comment: 'Lote de rastreabilidade industrial' },
  serial_number: { type: DataTypes.STRING(80), allowNull: true, comment: 'Numero de serie para rastreabilidade' },
  revision: { type: DataTypes.STRING(10), defaultValue: '00', comment: 'Revisão técnica' },
  // Parâmetros Thiele-Small (específicos para alto-falantes)
  ts_params_fs: DataTypes.DECIMAL(10, 2),
  ts_params_qms: DataTypes.DECIMAL(10, 2),
  ts_params_qes: DataTypes.DECIMAL(10, 2),
  ts_params_qts: DataTypes.DECIMAL(10, 2),
  ts_params_vas: DataTypes.DECIMAL(10, 2),
  ts_params_sd: DataTypes.DECIMAL(10, 2),
  ts_params_xmax: DataTypes.DECIMAL(10, 2),
  ts_params_re: DataTypes.DECIMAL(10, 2),
  ts_params_le: DataTypes.DECIMAL(10, 2),
  ts_params_bl: DataTypes.DECIMAL(10, 2),
  ts_params_mms: DataTypes.DECIMAL(10, 2),
  ts_params_cms: DataTypes.DECIMAL(10, 2),
  ts_params_spl: DataTypes.DECIMAL(10, 2)
}, {
  tableName: 'products',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['category_id'] }]
});

export = Product;

