/**
 * 🏦 Model: CnabRemittance (Arquivo de Remessa CNAB 240)
 *
 * @module models/CnabRemittance
 *
 * Um registro por arquivo de remessa de cobrança gerado
 * (`GenerateRemittanceUseCase`). `file_content` guarda o texto completo do
 * arquivo (posições fixas, `\r\n`) para re-download/auditoria — não é
 * gravado em disco (mesma filosofia de "nada de arquivo residual" do
 * upload OFX, mas aqui o conteúdo é gerado pelo próprio sistema, não
 * enviado por um usuário).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CnabRemittanceAttributes {
  id: number;
  sequential_number: number;
  bank_code: string;
  filename: string;
  file_content: string;
  total_items: number;
  total_amount: number;
  generated_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CnabRemittance = sequelize.define('CnabRemittance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sequential_number: { type: DataTypes.INTEGER, allowNull: false, comment: 'Número sequencial da remessa (CompanyBankingConfig.next_remittance_number no momento da geração)' },
  bank_code: { type: DataTypes.STRING(3), allowNull: false },
  filename: { type: DataTypes.STRING(60), allowNull: false, comment: 'Nome sugerido do arquivo (REMESSA_<seq>_<data>.REM)' },
  file_content: { type: DataTypes.TEXT, allowNull: false, comment: 'Conteúdo completo do arquivo CNAB 240 (linhas de 240 posições, separadas por \\r\\n)' },
  total_items: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: 'Quantidade de títulos incluídos (CnabRemittanceItem)' },
  total_amount: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Soma dos valores dos títulos incluídos' },
  generated_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id' },
}, {
  tableName: 'cnab_remittances',
  underscored: true,
  timestamps: true,
});

export = CnabRemittance;
