/**
 * 📦 Model: Asset (Ativos Fixos / Patrimônio)
 *
 * @module models/Asset
 *
 * Gerencia o patrimônio da fábrica: máquinas, equipamentos,
 * ferramentas, veículos, móveis e TI. Suporta depreciação.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface AssetAttributes {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  product_id: number | null;
  department_id: number | null;
  responsible_id: number | null;
  location: string | null;
  asset_type: 'machine' | 'equipment' | 'tool' | 'furniture' | 'vehicle' | 'it' | 'other';
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_value: number | null;
  current_value: number | null;
  useful_life_months: number | null;
  status: 'active' | 'in_maintenance' | 'decommissioned' | 'lost';
  qr_code: string | null;
  notes: string | null;
  last_inventory_date: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Asset = sequelize.define('Asset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tag: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Tag/plaqueta de identificação do ativo' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome do ativo' },
  description: DataTypes.TEXT,
  product_id: { type: DataTypes.INTEGER, comment: 'FK → products.id (quando aplicável)' },
  department_id: { type: DataTypes.INTEGER, comment: 'FK → departments.id' },
  responsible_id: { type: DataTypes.INTEGER, comment: 'FK → employees.id' },
  location: DataTypes.STRING(100),
  asset_type: { type: DataTypes.ENUM('machine', 'equipment', 'tool', 'furniture', 'vehicle', 'it', 'other'), defaultValue: 'equipment' },
  brand: DataTypes.STRING(100),
  model: DataTypes.STRING(100),
  serial_number: DataTypes.STRING(100),
  purchase_date: DataTypes.DATEONLY,
  purchase_value: { type: DataTypes.DECIMAL(10, 2), comment: 'Valor de aquisição' },
  current_value: { type: DataTypes.DECIMAL(10, 2), comment: 'Valor contábil atual' },
  useful_life_months: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('active', 'in_maintenance', 'decommissioned', 'lost'), defaultValue: 'active' },
  qr_code: DataTypes.STRING(255),
  notes: DataTypes.TEXT,
  last_inventory_date: DataTypes.DATEONLY
}, {
  tableName: 'assets',
  underscored: true,
  timestamps: true
});

export = Asset;
