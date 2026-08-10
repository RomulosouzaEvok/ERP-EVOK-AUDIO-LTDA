/**
 * 🧾 Model: PurchaseOrderApproval (Aprovação de alçada de pedido de compra —
 * G11)
 *
 * @module models/PurchaseOrderApproval
 *
 * Tabela `purchase_order_approvals` (migration `20260810-000029`, decisão
 * D-C do dono do produto em 2026-08-10). Mesmo padrão já aprovado em
 * `jur_contract_approvals` (RF-JUR-003): `approver_user_id` vem SEMPRE do
 * JWT e `approver_role` é SEMPRE resolvido pelo módulo de acesso do usuário
 * logado (`req.user.permissions.diretor`) em `ApprovePurchaseUseCase` —
 * nenhum dos dois é aceito do body. A UNIQUE (`purchase_id`,
 * `approver_role`) — constraint `uq_purchase_order_approvals_purchase_role`
 * — impede que o mesmo papel aprove duas vezes o mesmo pedido.
 *
 * A regra que determina QUANDO uma aprovação é exigida está em
 * `server/src/modules/purchases/domain/constants.ts` (por origem, não só por
 * valor).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type PurchaseApproverRole = 'diretor';

interface PurchaseOrderApprovalAttributes {
  id: number;
  purchase_id: number;
  approver_user_id: number;
  approver_role: PurchaseApproverRole;
  approved_at: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const PurchaseOrderApproval = sequelize.define<any, PurchaseOrderApprovalAttributes>('PurchaseOrderApproval', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_user_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_role: { type: DataTypes.ENUM('diretor'), allowNull: false },
  approved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'purchase_order_approvals',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['purchase_id'] },
    { unique: true, fields: ['purchase_id', 'approver_role'], name: 'uq_purchase_order_approvals_purchase_role' },
  ],
});

export = PurchaseOrderApproval;
