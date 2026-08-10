/**
 * 🧾 Model: HrAdmissionProcess (Admissão — módulo RH, Bloco 6)
 *
 * Tabela `hr_admission_processes` (migration `20260808-000015`). RF-RH-007
 * a 012, UC-69.
 *
 * @module models/HrAdmissionProcess
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrAdmissionProcess = sequelize.define('HrAdmissionProcess', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  job_vacancy_id: DataTypes.INTEGER,
  candidate_id: DataTypes.INTEGER,
  candidate_name: { type: DataTypes.STRING(200), allowNull: false },
  candidate_cpf: DataTypes.STRING(14),
  department_id: { type: DataTypes.INTEGER, allowNull: false },
  job_position_id: DataTypes.INTEGER,
  planned_start_date: { type: DataTypes.DATEONLY, allowNull: false },
  checklist_rg: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  checklist_cpf: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  checklist_ctps: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  checklist_pis: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  checklist_proof_of_address: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  checklist_photo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status: {
    type: DataTypes.ENUM('documentos_pendentes', 'aso_pendente', 'aguardando_esocial', 'concluida', 'cancelada'),
    allowNull: false,
    defaultValue: 'documentos_pendentes',
  },
  cancel_reason: DataTypes.TEXT,
  aso_requested_at: DataTypes.DATE,
  aso_confirmed_at: DataTypes.DATE,
  aso_result: DataTypes.ENUM('apto', 'inapto', 'apto_com_restricao'),
  aso_valid_until: DataTypes.DATEONLY,
  esocial_s2200_confirmed_at: DataTypes.DATE,
  esocial_s2200_confirmed_by: DataTypes.INTEGER,
  employee_id: DataTypes.INTEGER,
  contract_id: DataTypes.INTEGER,
  job_history_id: DataTypes.INTEGER,
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_admission_processes',
  underscored: true,
  timestamps: true,
});

export = HrAdmissionProcess;
