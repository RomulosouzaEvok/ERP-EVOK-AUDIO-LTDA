const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  min_quantity: { type: DataTypes.INTEGER, defaultValue: 5 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  location: { type: DataTypes.STRING(100), defaultValue: '' },
  product_type: { type: DataTypes.ENUM('finished', 'semi_finished', 'component', 'raw_material'), defaultValue: 'finished' },
  ncm: { type: DataTypes.STRING(10), defaultValue: '85182100' },
  cest: DataTypes.STRING(10),
  weight: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  unit: { type: DataTypes.STRING(10), defaultValue: 'un' },
  lead_time: { type: DataTypes.INTEGER, defaultValue: 0 },
  drawing_number: DataTypes.STRING(50),
  revision: { type: DataTypes.STRING(10), defaultValue: '00' },
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

module.exports = Product;

