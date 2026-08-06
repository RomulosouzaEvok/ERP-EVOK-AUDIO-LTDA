/**
 * 🏦 Model: CnabReturnFile (Arquivo de Retorno CNAB 240 Processado)
 *
 * @module models/CnabReturnFile
 *
 * Um registro por arquivo `.RET` processado (`ProcessReturnFileUseCase`).
 * Guarda metadados do processamento — o conteúdo bruto do arquivo NÃO é
 * persistido (diferente de `CnabRemittance.file_content`, que é gerado pelo
 * próprio sistema): o retorno é um arquivo recebido de terceiro (banco) e,
 * assim como o upload OFX, não deve virar arquivo residual no servidor além
 * do necessário para auditoria via `CnabReturnOccurrence`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface CnabReturnFileAttributes {
  id: number;
  filename: string;
  bank_code: string | null;
  occurrences_count: number;
  settled_count: number;
  duplicates_skipped: number;
  processed_by: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const CnabReturnFile = sequelize.define('CnabReturnFile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  filename: { type: DataTypes.STRING(255), allowNull: false, comment: 'Nome original do arquivo .RET enviado' },
  bank_code: { type: DataTypes.STRING(3), allowNull: true, comment: 'Código do banco extraído do Header de Arquivo do retorno' },
  occurrences_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: 'Total de ocorrências (pares Segmento T/U) lidas no arquivo' },
  settled_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: 'Quantas ocorrências resultaram em baixa de accounts_receivable' },
  duplicates_skipped: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: 'Ocorrências ignoradas por já terem sido processadas antes (reimportação do mesmo retorno)' },
  processed_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id' },
}, {
  tableName: 'cnab_return_files',
  underscored: true,
  timestamps: true,
});

export = CnabReturnFile;
