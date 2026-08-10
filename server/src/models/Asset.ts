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

interface AssetAttributes {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  product_id: number | null;
  department_id: number | null;
  responsible_id: number | null;
  location: string | null;
  asset_type: 'machine' | 'equipment' | 'tool' | 'furniture' | 'vehicle' | 'it' | 'other' | 'license';
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_value: number | null;
  current_value: number | null;
  useful_life_months: number | null;
  status: 'active' | 'in_maintenance' | 'decommissioned' | 'lost' | 'returned_to_supplier';
  qr_code: string | null;
  notes: string | null;
  last_inventory_date: string | null;
  photo_path: string | null;
  license_expires_at: string | null;
  purchase_item_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Asset = sequelize.define('Asset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tag: { type: DataTypes.STRING(20), allowNull: false, unique: true, comment: 'Tag/plaqueta de identificação do ativo' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome do ativo' },
  description: { type: DataTypes.TEXT, allowNull: true },
  product_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → products.id (quando aplicável)' },
  department_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → departments.id' },
  responsible_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → employees.id' },
  location: { type: DataTypes.STRING(100), allowNull: true },
  asset_type: { type: DataTypes.ENUM('machine', 'equipment', 'tool', 'furniture', 'vehicle', 'it', 'other', 'license'), defaultValue: 'equipment' },
  brand: { type: DataTypes.STRING(100), allowNull: true },
  model: { type: DataTypes.STRING(100), allowNull: true },
  serial_number: { type: DataTypes.STRING(100), allowNull: true },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
  purchase_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'Valor de aquisição' },
  current_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'Valor contábil atual' },
  useful_life_months: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'in_maintenance', 'decommissioned', 'lost', 'returned_to_supplier'),
    defaultValue: 'active',
    comment: "'returned_to_supplier': ativo com defeito de fabrica devolvido ao fornecedor de origem via NonConformity.immediate_action='return_supplier' (Bloco B, docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md) — distinto de 'lost' (extravio sem fornecedor responsavel)."
  },
  qr_code: { type: DataTypes.STRING(255), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  last_inventory_date: { type: DataTypes.DATEONLY, allowNull: true },
  photo_path: { type: DataTypes.STRING(500), allowNull: true },
  license_expires_at: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data de vencimento da licenca (usado quando asset_type = license)' },
  purchase_item_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → purchase_order_items.id (origem de compra do ativo, quando aplicável)' }
}, {
  tableName: 'assets',
  underscored: true,
  timestamps: true
});

export = Asset;
