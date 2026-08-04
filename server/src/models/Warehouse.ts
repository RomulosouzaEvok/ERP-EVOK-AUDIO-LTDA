/**
 * 🏭 Model: Warehouse (Depositos/Armazens)
 *
 * @module models/Warehouse
 *
 * Deposito fisico cadastravel do estoque (ex.: Insumos, Acabados,
 * Laboratorio). Seed obrigatorio de 3 registros no primeiro deploy
 * (INSUMOS, ACABADOS, LABORATORIO) — administrador pode cadastrar
 * depositos adicionais sem alteracao de codigo.
 *
 * Regras de Negocio (docs/business/BUSINESS_RULES.md §12,
 * docs/business/01-USE_CASES.md UC-42):
 * - `code` unico (ex.: INSUMOS, ACABADOS, LABORATORIO)
 * - Saldo por deposito vive em `ProductWarehouseStock`; o saldo total de
 *   um produto e sempre a soma dos saldos em todos os depositos ativos
 *   (invariante obrigatoria §12 item 3)
 * - Quarentena/bloqueio (`LotControl.status`) NAO e deposito — sao
 *   dimensoes ortogonais (§12 item 9)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface WarehouseAttributes {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface WarehouseCreationAttributes {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  active?: boolean;
}

const Warehouse = sequelize.define('Warehouse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: 'Codigo unico do deposito (ex.: INSUMOS, ACABADOS, LABORATORIO)',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nome descritivo do deposito',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'warehouses',
  underscored: true,
  timestamps: true,
});

export = Warehouse;
