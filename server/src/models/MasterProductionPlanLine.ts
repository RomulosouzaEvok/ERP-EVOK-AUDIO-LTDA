/**
 * 🗓️ Model: MasterProductionPlanLine (Linha do Plano Mestre — MPS, G17)
 *
 * @module models/MasterProductionPlanLine
 *
 * Tabela `master_production_plan_lines` (migration `20260810-000037`). Uma
 * linha por produto por plano (índice único `plan_id + product_id`).
 *
 * ## As três famílias de coluna, e por que estão separadas
 *
 * | Família | Colunas | Origem |
 * |---|---|---|
 * | **Demanda** | `demand_sales_orders`, `demand_safety_stock`, `demand_forecast` → `gross_requirement` | carteira aberta, `products.min_quantity`, previsão manual |
 * | **Suprimento** | `supply_on_hand`, `supply_withheld`, `supply_reserved`, `supply_in_production` | saldo de planejamento + OPs abertas |
 * | **Decisão** | `suggested_quantity` (sistema) × `planned_quantity` (humano) | cálculo × planejador |
 *
 * A separação sugestão × decisão é o ponto do G17: se a decisão sobrescrevesse
 * a sugestão, ninguém conseguiria auditar **onde o planejador divergiu do
 * cálculo** — que é exatamente o que uma auditoria de PCP procura.
 *
 * ## O saldo usado é o saldo de planejamento, não o saldo físico
 *
 * `supply_on_hand` já vem líquido de quarentena (G7) e de reserva (G3/G9):
 * `max(0, products.quantity − retido − reservado)`. Material não inspecionado e
 * material reservado para outra ordem/venda **não** contam como disponível —
 * planejar em cima deles é planejar em cima de material que a produção não
 * pode consumir. `supply_withheld` e `supply_reserved` ficam gravados na
 * linha para que o número seja auditável depois, sem refazer a conta.
 *
 * ⚠️ A migration `20260810-000037` ainda **não foi aplicada** ao banco de
 * desenvolvimento.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

/** Estado da linha dentro do ciclo do plano. */
type MasterProductionPlanLineStatus = 'pending' | 'planned' | 'dismissed' | 'released';

interface MasterProductionPlanLineAttributes {
  id: number;
  plan_id: number;
  product_id: number;
  demand_sales_orders: number;
  demand_safety_stock: number;
  demand_forecast: number;
  gross_requirement: number;
  supply_on_hand: number;
  supply_withheld: number;
  supply_reserved: number;
  supply_in_production: number;
  net_requirement: number;
  suggested_quantity: number;
  planned_quantity: number;
  due_date: string;
  status: MasterProductionPlanLineStatus;
  production_order_id: number | null;
  decided_by: number | null;
  decided_at: Date | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const MasterProductionPlanLine = sequelize.define<any, MasterProductionPlanLineAttributes>('MasterProductionPlanLine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plan_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> master_production_plans.id' },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id' },
  demand_sales_orders: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Carteira aberta: soma de (quantity - invoiced_quantity) das vendas confirmed/partially_invoiced' },
  demand_safety_stock: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'products.min_quantity — estoque minimo como demanda de planejamento' },
  demand_forecast: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Previsao manual do planejador (nao existe entidade de forecast no ERP)' },
  gross_requirement: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Soma das tres demandas' },
  supply_on_hand: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Saldo de PLANEJAMENTO: max(0, fisico - retido em quarentena/bloqueio - reservado)' },
  supply_withheld: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Retido em lot_controls quarantine/blocked, ja descontado de supply_on_hand (guardado para auditoria)' },
  supply_reserved: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'products.reserved_quantity, ja descontado de supply_on_hand (guardado para auditoria)' },
  supply_in_production: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Saldo a produzir das OPs abertas (planned/released/in_progress/paused)' },
  net_requirement: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'max(0, gross_requirement - supply_on_hand - supply_in_production)' },
  suggested_quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'Sugestao do sistema (= necessidade liquida crua, sem lote minimo)' },
  planned_quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, comment: 'DECISAO do planejador — o que sera produzido' },
  due_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Data de necessidade; vira due_date da OP gerada' },
  status: {
    type: DataTypes.ENUM('pending', 'planned', 'dismissed', 'released'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'pending | planned | dismissed | released'
  },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> production_orders.id gerada por esta linha (rastro de origem)' },
  decided_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id de quem decidiu a linha (do JWT)' },
  decided_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'master_production_plan_lines',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['plan_id', 'product_id'], unique: true },
    { fields: ['status'] },
    { fields: ['production_order_id'] }
  ]
});

export = MasterProductionPlanLine;
