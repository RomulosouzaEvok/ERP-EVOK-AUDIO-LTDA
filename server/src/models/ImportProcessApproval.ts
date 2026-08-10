/**
 * 🧾 Model: ImportProcessApproval (Aprovação da diretoria em processo de
 * importação — G11-COMEX)
 *
 * @module models/ImportProcessApproval
 *
 * Tabela `import_process_approvals` (migration `20260810-000031`, decisão
 * D-G do dono do produto em 2026-08-10). Mesmo desenho já aprovado em
 * `purchase_order_approvals` (G11) e `jur_contract_approvals`
 * (RF-JUR-003): `approver_user_id` vem SEMPRE do JWT e `approver_role` é
 * SEMPRE resolvido pelo módulo de acesso do usuário logado
 * (`req.user.permissions.diretor`) em `ApproveImportProcessUseCase` —
 * nenhum dos dois é aceito do body. A UNIQUE (`import_process_id`,
 * `approver_role`) — constraint
 * `uq_import_process_approvals_process_role` — impede que o mesmo papel
 * aprove duas vezes o mesmo processo.
 *
 * A regra que determina QUANDO a aprovação é exigida (e o que ela congela)
 * está em `server/src/modules/comex/domain/constants.ts`: importação é
 * sempre da diretoria, e o gate trava a transição `draft → shipped`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type ImportApproverRole = 'diretor';

interface ImportProcessApprovalAttributes {
  id: number;
  import_process_id: number;
  approver_user_id: number;
  approver_role: ImportApproverRole;
  approved_at: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ImportProcessApproval = sequelize.define<any, ImportProcessApprovalAttributes>('ImportProcessApproval', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  import_process_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_user_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_role: { type: DataTypes.ENUM('diretor'), allowNull: false },
  approved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'import_process_approvals',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['import_process_id'] },
    { unique: true, fields: ['import_process_id', 'approver_role'], name: 'uq_import_process_approvals_process_role' },
  ],
});

export = ImportProcessApproval;
