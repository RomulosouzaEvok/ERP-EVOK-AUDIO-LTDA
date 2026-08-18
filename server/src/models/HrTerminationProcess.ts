/**
 * 🧾 Model: HrTerminationProcess (Demissão/Rescisão — módulo RH, Bloco 6)
 *
 * Tabela `hr_termination_processes` (migration `20260808-000016`).
 * RF-RH-017 a 023, UC-70. `payment_deadline` é coluna GERADA pelo banco
 * (`termination_date + 10`, Art. 477 §6º CLT) — não deve ser gravada pela
 * aplicação (Sequelize a trata como somente-leitura via `attributes`
 * excluídos do payload de escrita nos repositórios/use cases).
 *
 * @module models/HrTerminationProcess
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrTerminationProcess = sequelize.define('HrTerminationProcess', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  termination_type: {
    type: DataTypes.ENUM('pedido', 'sem_justa_causa', 'justa_causa', 'termino_experiencia', 'acordo'),
    allowNull: false,
  },
  notice_date: { type: DataTypes.DATEONLY, allowNull: false },
  notice_modality: { type: DataTypes.ENUM('trabalhado', 'indenizado'), allowNull: false },
  termination_reason: { type: DataTypes.TEXT, allowNull: false },
  termination_date: DataTypes.DATEONLY,
  trct_file_path: DataTypes.STRING(255),
  trct_paid_at: DataTypes.DATE,
  payment_deadline: { type: DataTypes.DATEONLY, allowNull: true }, // GENERATED ALWAYS AS no banco — nunca gravado pela aplicação.
  s2299_confirmed_at: DataTypes.DATE,
  s2299_confirmed_by: DataTypes.INTEGER,
  aso_confirmed_at: DataTypes.DATE,
  aso_result: DataTypes.ENUM('apto', 'inapto', 'apto_com_restricao'),
  checklist_assets_returned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status: {
    type: DataTypes.ENUM('aberto', 'aguardando_aso', 'aguardando_trct', 'concluido', 'cancelado'),
    allowNull: false,
    defaultValue: 'aberto',
  },
  cancel_reason: DataTypes.TEXT,
  concluded_by: DataTypes.INTEGER,
  concluded_at: DataTypes.DATE,
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_termination_processes',
  underscored: true,
  timestamps: true,
});

export = HrTerminationProcess;
