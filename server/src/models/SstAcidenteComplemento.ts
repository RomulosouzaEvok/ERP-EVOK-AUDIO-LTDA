/**
 * 🦺 Model: SstAcidenteComplemento (trilha de auditoria de dias_perdidos/houve_cat)
 *
 * @module models/SstAcidenteComplemento
 *
 * Tabela `sst_acidente_complementos` (migration `20260806-000135`,
 * adicionada na auditoria cruzada). Insert-only — registra
 * quem/quando/motivo de cada alteração das 2 únicas colunas que o trigger
 * `sst_lock_acidente` permite atualizar em `sst_acidentes` após
 * confirmado.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AcidenteComplementoCampo = 'dias_perdidos' | 'houve_cat';

interface SstAcidenteComplementoAttributes {
  id: number;
  acidente_id: number;
  campo: AcidenteComplementoCampo;
  valor_anterior: string | null;
  valor_novo: string;
  motivo: string;
  registrado_por: number;
  readonly createdAt?: Date;
}

const SstAcidenteComplemento = sequelize.define<any, SstAcidenteComplementoAttributes>('SstAcidenteComplemento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  acidente_id: { type: DataTypes.INTEGER, allowNull: false },
  campo: { type: DataTypes.ENUM('dias_perdidos', 'houve_cat'), allowNull: false },
  valor_anterior: DataTypes.STRING(50),
  valor_novo: { type: DataTypes.STRING(50), allowNull: false },
  motivo: { type: DataTypes.TEXT, allowNull: false },
  registrado_por: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_acidente_complementos',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['acidente_id'] }]
});

export = SstAcidenteComplemento;
