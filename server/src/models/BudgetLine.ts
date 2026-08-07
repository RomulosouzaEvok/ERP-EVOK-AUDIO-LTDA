/**
 * 💰 Model: BudgetLine (Linha de Orçamento — Controladoria)
 *
 * @module models/BudgetLine
 *
 * Linha de orçamento anual/mensal por Centro de Custo (`CostCenter`), do
 * módulo Controladoria (subárea CTR do departamento Financeiro, sem linha
 * própria em `departments` — `docs/financeiro/00-README.md`, escopo "Custos
 * Industriais, Orçamento, DRE"). É a única peça genuinamente nova desta
 * subárea: custeio industrial já existe em `production`/`reports`, e Centros
 * de Custo já existem em `server/src/modules/financial/`.
 *
 * `month` é OPCIONAL: `NULL` representa uma linha ANUAL "achatada" (o ano
 * inteiro em uma única linha, sem detalhamento mês a mês); `1`–`12`
 * representa uma linha MENSAL. Ver comentário completo da decisão na
 * migration `20260807-000250-create-budget-module.cjs`.
 *
 * Unicidade `(cost_center_id, year, month, category)` é garantida por um
 * ÍNDICE DE EXPRESSÃO em SQL (`COALESCE(month, 0)`), não pela definição de
 * `indexes` do Sequelize abaixo (que não expressa `COALESCE`) — por isso o
 * índice de unicidade não é declarado aqui, apenas na migration.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type BudgetLineCategory = 'custo_fixo' | 'custo_variavel' | 'investimento' | 'outro';

interface BudgetLineAttributes {
  id: number;
  cost_center_id: number;
  year: number;
  month: number | null;
  category: BudgetLineCategory;
  planned_amount: number;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const BudgetLine = sequelize.define('BudgetLine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cost_center_id: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: true, comment: 'NULL = linha anual "achatada"; 1-12 = linha mensal' },
  category: {
    type: DataTypes.ENUM('custo_fixo', 'custo_variavel', 'investimento', 'outro'),
    allowNull: false,
    defaultValue: 'outro',
  },
  planned_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'budget_lines',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['year', 'month'], name: 'idx_budget_lines_year_month' },
    { fields: ['cost_center_id'], name: 'idx_budget_lines_cost_center_id' },
  ],
});

export = BudgetLine;
