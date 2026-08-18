/**
 * 🗓️ Model: MasterProductionPlan (Plano Mestre de Produção — MPS, G17)
 *
 * @module models/MasterProductionPlan
 *
 * Tabela `master_production_plans` (migration `20260810-000037`, decisão D-F do
 * dono do produto: **existe PCP formal, há quem planeje**).
 *
 * É a camada que faltava entre a carteira de pedidos e a fábrica. Antes do
 * G17, confirmar uma venda não produzia efeito nenhum na produção e o MRP só
 * calculava contra a demanda digitada no payload — a ponte era memória de
 * quem planeja, sem registro nem rastro.
 *
 * ## O que este plano NÃO é
 *
 * Não é gatilho automático. Nenhuma linha do sistema gera OP na confirmação
 * do pedido: o plano consolida a informação, **uma pessoa decide** (campo
 * `planned_quantity` das linhas) e só então a liberação explícita do plano
 * firme cria as ordens de produção, com rastro de origem gravado em
 * `master_production_plan_lines.production_order_id`.
 *
 * ## Ciclo de vida
 *
 * ```
 * draft ──(firm)──> firm ──(release)──> released
 *   │                 │
 *   └────(cancel)─────┴──> canceled
 * ```
 *
 * - `draft`: demanda já consolidada, linhas editáveis pelo planejador;
 * - `firm`: decisão congelada — as linhas não mudam mais;
 * - `released`: OPs geradas (terminal);
 * - `canceled`: terminal, a partir de `draft` ou `firm`.
 *
 * ⚠️ A migration `20260810-000037` **não foi aplicada** ao banco de
 * desenvolvimento (aplicar migrations está bloqueado por permissão do
 * ambiente — ver `docs/governance/TODO.md`). Registrar o model é inócuo até
 * lá (Sequelize não valida contra o banco em tempo de `define`), mas nenhuma
 * consulta a `master_production_plans` funciona antes de a migration rodar.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

/** Estado do ciclo de vida do plano mestre. */
type MasterProductionPlanStatus = 'draft' | 'firm' | 'released' | 'canceled';

interface MasterProductionPlanAttributes {
  id: number;
  plan_number: string;
  horizon_start: string;
  horizon_end: string;
  status: MasterProductionPlanStatus;
  created_by: number;
  planner_id: number;
  consolidated_at: Date;
  firmed_by: number | null;
  firmed_at: Date | null;
  released_by: number | null;
  released_at: Date | null;
  canceled_by: number | null;
  canceled_at: Date | null;
  cancel_reason: string | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MasterProductionPlan = sequelize.define<any, MasterProductionPlanAttributes>('MasterProductionPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plan_number: { type: DataTypes.STRING(30), allowNull: false, unique: true, comment: 'Numero do plano (MPS-YYYY-NNNN)' },
  horizon_start: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Inicio do horizonte declarado pelo planejador (sem default: horizonte e politica de PCP nao definida pelo dono)' },
  horizon_end: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Fim do horizonte; vira a data de necessidade padrao das linhas' },
  status: {
    type: DataTypes.ENUM('draft', 'firm', 'released', 'canceled'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'draft | firm | released | canceled — so plano firm gera OP'
  },
  created_by: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id de quem abriu o plano (SEMPRE do JWT)' },
  planner_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> users.id — SEMPRE do JWT, nunca do body' },
  consolidated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, comment: 'Momento da fotografia da demanda; o plano nao se re-consolida sozinho' },
  firmed_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem congelou a decisao (do JWT)' },
  firmed_at: { type: DataTypes.DATE, allowNull: true },
  released_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem liberou as OPs (do JWT)' },
  released_at: { type: DataTypes.DATE, allowNull: true },
  canceled_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem cancelou (do JWT)' },
  canceled_at: { type: DataTypes.DATE, allowNull: true },
  cancel_reason: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'master_production_plans',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['planner_id'] },
    { fields: ['created_by'] }
  ]
});

export = MasterProductionPlan;
