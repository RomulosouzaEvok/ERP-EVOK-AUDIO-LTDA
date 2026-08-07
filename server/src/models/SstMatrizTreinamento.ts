/**
 * 🦺 Model: SstMatrizTreinamento (Matriz função × norma de treinamento de segurança)
 *
 * @module models/SstMatrizTreinamento
 *
 * Tabela `sst_matriz_treinamento` (migration `20260806-000140`).
 * `periodicidade_reciclagem_meses` NULO = sem reciclagem periódica exigida;
 * nenhum valor é hard-coded (RF-SST-045).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type TreinamentoNormaMatriz = 'NR-6' | 'NR-10' | 'NR-11' | 'NR-12' | 'NR-17' | 'NR-20' | 'NR-23_brigada' | 'primeiros_socorros' | 'CIPA' | 'outro';

interface SstMatrizTreinamentoAttributes {
  id: number;
  position: string;
  norma: TreinamentoNormaMatriz;
  periodicidade_reciclagem_meses: number | null;
  ativo: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstMatrizTreinamento = sequelize.define<any, SstMatrizTreinamentoAttributes>('SstMatrizTreinamento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  position: { type: DataTypes.STRING(100), allowNull: false },
  norma: {
    type: DataTypes.ENUM('NR-6', 'NR-10', 'NR-11', 'NR-12', 'NR-17', 'NR-20', 'NR-23_brigada', 'primeiros_socorros', 'CIPA', 'outro'),
    allowNull: false
  },
  periodicidade_reciclagem_meses: { type: DataTypes.INTEGER, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'sst_matriz_treinamento',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['position'] }
  ]
});

export = SstMatrizTreinamento;
