/**
 * 🦺 Model: SstTreinamento (Realização de treinamento de segurança, TreinamentoSST)
 *
 * @module models/SstTreinamento
 *
 * Tabela `sst_treinamentos` (migration `20260806-000140`). `validade` é
 * calculada em app a partir de `sst_matriz_treinamento.periodicidade_reciclagem_meses`
 * (NR-10 = 24 meses default confirmado; demais normas
 * `[VERIFICAR COM TÉCNICO SST DA EMPRESA]`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TreinamentoNorma = 'NR-6' | 'NR-10' | 'NR-11' | 'NR-12' | 'NR-17' | 'NR-20' | 'NR-23_brigada' | 'primeiros_socorros' | 'CIPA' | 'DDS_tema' | 'outro';

interface SstTreinamentoAttributes {
  id: number;
  employee_id: number;
  norma: TreinamentoNorma;
  curso_descricao: string | null;
  data_realizacao: string;
  carga_horaria: number;
  instrutor_entidade: string | null;
  certificado_url: string | null;
  validade: string | null;
  identificacao_operador: string | null;
  created_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstTreinamento = sequelize.define<any, SstTreinamentoAttributes>('SstTreinamento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  norma: {
    type: DataTypes.ENUM('NR-6', 'NR-10', 'NR-11', 'NR-12', 'NR-17', 'NR-20', 'NR-23_brigada', 'primeiros_socorros', 'CIPA', 'DDS_tema', 'outro'),
    allowNull: false
  },
  curso_descricao: { type: DataTypes.STRING(200), allowNull: true },
  data_realizacao: { type: DataTypes.DATEONLY, allowNull: false },
  carga_horaria: { type: DataTypes.INTEGER, allowNull: false },
  instrutor_entidade: { type: DataTypes.STRING(150), allowNull: true },
  certificado_url: { type: DataTypes.STRING(255), allowNull: true },
  validade: { type: DataTypes.DATEONLY, allowNull: true },
  identificacao_operador: { type: DataTypes.STRING(60), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id' }
}, {
  tableName: 'sst_treinamentos',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['norma'] },
    { fields: ['validade'] }
  ]
});

export = SstTreinamento;
