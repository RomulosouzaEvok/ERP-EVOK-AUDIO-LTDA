/**
 * 🦺 Model: SstCat (Comunicação de Acidente de Trabalho — eSocial S-2210)
 *
 * @module models/SstCat
 *
 * Tabela `sst_cats` (migration `20260806-000136`). Conteúdo legal imutável
 * desde o INSERT (trigger `sst_lock_cat`) — apenas as colunas de status
 * eSocial (`status_esocial_s2210`, `recibo_esocial`, `data_envio_esocial`)
 * podem mudar depois. Reabertura = nova linha `tipo = 'reabertura'`, nunca
 * edição.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type CatTipo = 'inicial' | 'reabertura' | 'obito';
type CatStatusEsocial = 'pendente' | 'enviado' | 'aceito' | 'rejeitado';

interface SstCatAttributes {
  id: number;
  acidente_id: number;
  numero_cat: string | null;
  tipo: CatTipo;
  data_emissao: string;
  prazo_limite: string;
  emitente_id: number;
  status_esocial_s2210: CatStatusEsocial;
  recibo_esocial: string | null;
  data_envio_esocial: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstCat = sequelize.define<any, SstCatAttributes>('SstCat', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  acidente_id: { type: DataTypes.INTEGER, allowNull: false },
  numero_cat: DataTypes.STRING(60),
  tipo: { type: DataTypes.ENUM('inicial', 'reabertura', 'obito'), allowNull: false },
  data_emissao: { type: DataTypes.DATEONLY, allowNull: false },
  prazo_limite: { type: DataTypes.DATEONLY, allowNull: false },
  emitente_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' },
  status_esocial_s2210: { type: DataTypes.ENUM('pendente', 'enviado', 'aceito', 'rejeitado'), allowNull: false, defaultValue: 'pendente' },
  recibo_esocial: DataTypes.STRING(80),
  data_envio_esocial: DataTypes.DATE
}, {
  tableName: 'sst_cats',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['acidente_id'] },
    { fields: ['status_esocial_s2210'] },
    { fields: ['prazo_limite'] }
  ]
});

export = SstCat;
