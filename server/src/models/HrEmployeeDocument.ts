/**
 * 📎 Model: HrEmployeeDocument (Documentos do Funcionário — módulo RH, Bloco 6)
 *
 * Tabela `hr_employee_documents` (migration `20260808-000017`). RF-RH-027 a
 * 030. Usado nesta passada P0 principalmente como *gate* de ASO
 * (`hasValidAso`) para Admissão/Demissão/Retorno de Afastamento — nunca
 * armazena laudo clínico (RF-RH-028).
 *
 * @module models/HrEmployeeDocument
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const HrEmployeeDocument = sequelize.define('HrEmployeeDocument', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  doc_type: {
    type: DataTypes.ENUM(
      'rg', 'cpf', 'ctps',
      'aso_admissional', 'aso_periodico', 'aso_retorno', 'aso_mudanca_risco', 'aso_demissional',
      'contrato', 'certificado', 'outro',
    ),
    allowNull: false,
  },
  file_path: { type: DataTypes.STRING(255), allowNull: false },
  valid_until: DataTypes.DATEONLY,
  aptitude_result: DataTypes.ENUM('apto', 'inapto', 'apto_com_restricao'),
  origin: { type: DataTypes.ENUM('rh', 'sst'), allowNull: false, defaultValue: 'rh' },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'hr_employee_documents',
  underscored: true,
  timestamps: true,
});

export = HrEmployeeDocument;
