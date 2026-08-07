/**
 * 🦺 Model: SstTipoEpi (Catálogo de EPI homologado — NR-6)
 *
 * @module models/SstTipoEpi
 *
 * Tabela `sst_tipos_epi` (migration `20260806-000130`). Nomes de coluna em
 * português (decisão deliberada do módulo SST, ver
 * `docs/business/BLOCO_1_SST_MODELO_DADOS.md` §0) — a tradução para o
 * contrato REST em inglês (`ca_numero`, `active`, `tamanhos`) é feita pelo
 * mapper de infraestrutura (`server/src/modules/sst/infrastructure/mappers`),
 * nunca neste model.
 *
 * Vínculo opcional 1:1 (`item_id`, UNIQUE) com `items.id` (almoxarifado) —
 * não duplica saldo/estoque, apenas referencia o Item quando o EPI é
 * controlado fisicamente (BLOCO_1_SST_REQUISITOS.md §5.2).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SstTipoEpiAttributes {
  id: number;
  nome: string;
  descricao: string | null;
  ca: string;
  ca_validade: string;
  fabricante: string | null;
  vida_util_dias: number;
  tamanhos_variacoes: string | null;
  foto_url: string | null;
  ativo: boolean;
  item_id: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstTipoEpi = sequelize.define<any, SstTipoEpiAttributes>('SstTipoEpi', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  descricao: DataTypes.TEXT,
  ca: { type: DataTypes.STRING(20), allowNull: false, comment: 'Certificado de Aprovação (CAEPI/MTE) — BR-SST-001' },
  ca_validade: { type: DataTypes.DATEONLY, allowNull: false },
  fabricante: DataTypes.STRING(150),
  vida_util_dias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tamanhos_variacoes: DataTypes.STRING(255),
  foto_url: DataTypes.STRING(255),
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  item_id: { type: DataTypes.UUID, allowNull: true, unique: true, comment: 'FK opcional 1:1 -> items.id' },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_tipos_epi',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['ativo'] },
    { fields: ['ca'] }
  ]
});

export = SstTipoEpi;
