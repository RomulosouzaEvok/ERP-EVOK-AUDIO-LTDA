/**
 * 🦺 Model: SstInspecaoItem (Item do checklist de uma inspeção de segurança)
 *
 * @module models/SstInspecaoItem
 *
 * Tabela `sst_inspecao_itens` (migration `20260806-000141`). Item
 * `conforme = false` gera automaticamente uma `SstAcaoCorretiva`
 * (BR-SST-033), referenciada em `acao_corretiva_id`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstInspecaoItemAttributes {
  id: number;
  inspecao_id: number;
  item_verificado: string;
  conforme: boolean;
  observacao: string | null;
  acao_corretiva_id: number | null;
  readonly createdAt?: Date;
}

const SstInspecaoItem = sequelize.define<any, SstInspecaoItemAttributes>('SstInspecaoItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  inspecao_id: { type: DataTypes.INTEGER, allowNull: false },
  item_verificado: { type: DataTypes.STRING(200), allowNull: false },
  conforme: { type: DataTypes.BOOLEAN, allowNull: false },
  observacao: { type: DataTypes.TEXT, allowNull: true },
  acao_corretiva_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> sst_acoes_corretivas.id' }
}, {
  tableName: 'sst_inspecao_itens',
  underscored: true,
  timestamps: false,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['inspecao_id'] },
    { fields: ['conforme'] }
  ]
});

export = SstInspecaoItem;
