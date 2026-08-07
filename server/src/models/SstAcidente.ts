/**
 * 🦺 Model: SstAcidente (Acidente de trabalho — Lei 8.213/91)
 *
 * @module models/SstAcidente
 *
 * Tabela `sst_acidentes` (migration `20260806-000135`). **Imutável após
 * `confirmado = true`** exceto `dias_perdidos`/`houve_cat`, via trigger
 * `sst_lock_acidente` (RNF-SST-01/BR-SST-017). Qualquer outra alteração
 * pós-confirmação deve ser feita via `sst_acidente_complementos`
 * (insert-only) + atualização controlada dessas 2 colunas na mesma
 * transação — nunca um `UPDATE` livre.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AcidenteTipo = 'tipico' | 'trajeto' | 'doenca_ocupacional';
type AcidenteGravidade = 'sem_afastamento' | 'com_afastamento' | 'incapacidade_permanente' | 'obito';

interface SstAcidenteAttributes {
  id: number;
  employee_id: number;
  data_hora: Date;
  tipo: AcidenteTipo;
  setor_local: string;
  descricao: string;
  parte_corpo_atingida: string | null;
  agente_causador: string | null;
  gravidade: AcidenteGravidade;
  dias_perdidos: number;
  houve_cat: boolean;
  justificativa_sem_cat: string | null;
  confirmado: boolean;
  confirmado_em: Date | null;
  registrado_por: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstAcidente = sequelize.define<any, SstAcidenteAttributes>('SstAcidente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  data_hora: { type: DataTypes.DATE, allowNull: false },
  tipo: { type: DataTypes.ENUM('tipico', 'trajeto', 'doenca_ocupacional'), allowNull: false },
  setor_local: { type: DataTypes.STRING(150), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: false },
  parte_corpo_atingida: DataTypes.STRING(100),
  agente_causador: DataTypes.STRING(150),
  gravidade: { type: DataTypes.ENUM('sem_afastamento', 'com_afastamento', 'incapacidade_permanente', 'obito'), allowNull: false },
  dias_perdidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  houve_cat: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  justificativa_sem_cat: DataTypes.TEXT,
  confirmado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  confirmado_em: DataTypes.DATE,
  registrado_por: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_acidentes',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['data_hora'] },
    { fields: ['gravidade'] }
  ]
});

export = SstAcidente;
