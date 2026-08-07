/**
 * ⚖️ Model: LegalContract (Contrato — Jurídico)
 *
 * @module models/LegalContract
 *
 * Cadastro central de contrato do módulo Jurídico (departamento 16, sigla
 * JUR — ver `docs/juridico/01-CONTRATOS.md`). Cobre tanto contratos
 * trabalhistas (CLT indeterminado/determinado, experiência, estágio,
 * aprendiz) quanto comerciais (distribuição, representação, fornecimento,
 * prestação de serviços, confidencialidade/NDA, licenciamento de marca).
 *
 * `party_a`/`party_b` são texto livre (não FK de `suppliers`/`clients`):
 * contratos jurídicos cobrem terceiros que nem sempre têm cadastro formal em
 * outra tabela do sistema no momento da assinatura (ex.: representante
 * autônomo, candidato a estágio). `file_path` segue o mesmo padrão de
 * armazenamento local em `uploads/` usado pelo restante do projeto
 * (`services/uploadService`), populado via `POST /api/legal/contracts/:id/file`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LegalContractType =
  | 'clt_indeterminado' | 'clt_determinado' | 'experiencia' | 'estagio' | 'aprendiz'
  | 'distribuicao' | 'representacao_comercial' | 'fornecimento' | 'prestacao_servicos'
  | 'confidencialidade' | 'licenciamento_marca' | 'outro';

type LegalContractStatus = 'draft' | 'signed' | 'active' | 'expired' | 'terminated';

interface LegalContractAttributes {
  id: number;
  contract_number: string;
  contract_type: LegalContractType;
  title: string;
  party_a: string;
  party_b: string;
  subject: string | null;
  value: number | null;
  start_date: string;
  end_date: string | null;
  auto_renewal: boolean;
  notice_period_days: number | null;
  file_path: string | null;
  status: LegalContractStatus;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const LegalContract = sequelize.define('LegalContract', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  contract_type: {
    type: DataTypes.ENUM(
      'clt_indeterminado', 'clt_determinado', 'experiencia', 'estagio', 'aprendiz',
      'distribuicao', 'representacao_comercial', 'fornecimento', 'prestacao_servicos',
      'confidencialidade', 'licenciamento_marca', 'outro',
    ),
    allowNull: false,
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  party_a: { type: DataTypes.STRING(200), allowNull: false },
  party_b: { type: DataTypes.STRING(200), allowNull: false },
  subject: { type: DataTypes.TEXT, allowNull: true },
  value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  auto_renewal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  notice_period_days: { type: DataTypes.INTEGER, allowNull: true },
  file_path: { type: DataTypes.STRING(255), allowNull: true },
  status: {
    type: DataTypes.ENUM('draft', 'signed', 'active', 'expired', 'terminated'),
    allowNull: false,
    defaultValue: 'draft',
  },
}, {
  tableName: 'legal_contracts',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['contract_number'], name: 'uq_legal_contracts_contract_number', unique: true },
    { fields: ['status'], name: 'idx_legal_contracts_status' },
    { fields: ['contract_type'], name: 'idx_legal_contracts_contract_type' },
    { fields: ['end_date'], name: 'idx_legal_contracts_end_date' },
  ],
});

export = LegalContract;
