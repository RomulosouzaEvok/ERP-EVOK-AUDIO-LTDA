/**
 * 🦺 Model: SstAso (Atestado de Saúde Ocupacional — NR-7, PCMSO)
 *
 * @module models/SstAso
 *
 * Tabela `sst_asos` (migration `20260806-000134`). Entidade PRÓPRIA do
 * módulo SST — nunca um registro em `employee_documents`
 * (`BLOCO_1_SST_REQUISITOS.md` §5.1). Dado clínico sensível (LGPD):
 * `resultado`, `restricoes`, `medico_examinador`, `arquivo_url`. Sem
 * trigger de imutabilidade (decisão do brief — correção de laudo é possível
 * por decisão médica; a trilha é o AuditLog padrão do projeto).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type AsoTipo = 'admissional' | 'periodico' | 'retorno_trabalho' | 'mudanca_riscos' | 'demissional';
type AsoResultado = 'apto' | 'inapto' | 'apto_com_restricoes';
type AsoStatusEsocial = 'pendente' | 'enviado' | 'aceito' | 'rejeitado';

interface SstAsoAttributes {
  id: number;
  employee_id: number;
  tipo: AsoTipo;
  data_realizacao: string;
  resultado: AsoResultado;
  restricoes: string | null;
  medico_examinador: string;
  medico_coordenador_pcmso: string | null;
  data_vencimento: string | null;
  arquivo_url: string | null;
  status_esocial_s2220: AsoStatusEsocial;
  recibo_esocial: string | null;
  registrado_por: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SstAso = sequelize.define<any, SstAsoAttributes>('SstAso', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.ENUM('admissional', 'periodico', 'retorno_trabalho', 'mudanca_riscos', 'demissional'), allowNull: false },
  data_realizacao: { type: DataTypes.DATEONLY, allowNull: false },
  resultado: { type: DataTypes.ENUM('apto', 'inapto', 'apto_com_restricoes'), allowNull: false },
  restricoes: { type: DataTypes.TEXT, allowNull: true, comment: 'Dado clínico sensível (LGPD)' },
  medico_examinador: { type: DataTypes.STRING(150), allowNull: false },
  medico_coordenador_pcmso: DataTypes.STRING(150),
  data_vencimento: DataTypes.DATEONLY,
  arquivo_url: DataTypes.STRING(255),
  status_esocial_s2220: { type: DataTypes.ENUM('pendente', 'enviado', 'aceito', 'rejeitado'), allowNull: false, defaultValue: 'pendente' },
  recibo_esocial: DataTypes.STRING(80),
  registrado_por: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'sst_asos',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['tipo'] },
    { fields: ['data_vencimento'] },
    { fields: ['status_esocial_s2220'] }
  ]
});

export = SstAso;
