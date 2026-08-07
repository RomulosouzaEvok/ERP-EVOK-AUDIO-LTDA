import type { Transaction } from 'sequelize';

/**
 * Implementação Sequelize/PostgreSQL do {@link BudgetRepository}.
 *
 * @module modules/budget/infrastructure/sequelize/SequelizeBudgetRepository
 */

const { QueryTypes } = require('sequelize');
const BudgetRepository = require('../../domain/repositories/BudgetRepository');
const { sequelize } = require('../../../../config/database');
const { BudgetLine, CostCenter } = require('../../../../models/index');

class SequelizeBudgetRepository extends BudgetRepository {
  // ---- Linhas de Orçamento ----

  async listBudgetLines(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.year) where.year = filters.year;
    if (typeof filters.month === 'number') where.month = filters.month;
    if (filters.cost_center_id) where.cost_center_id = filters.cost_center_id;
    if (filters.category) where.category = filters.category;

    const { count, rows } = await BudgetLine.findAndCountAll({
      where,
      include: [{ model: CostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['year', 'DESC'], ['month', 'ASC'], ['id', 'ASC']],
    });

    return { rows, count };
  }

  async findBudgetLineById(id: number) {
    return BudgetLine.findByPk(id, { include: [{ model: CostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] }] });
  }

  async findBudgetLineByKey(costCenterId: number, year: number, month: number | null, category: string) {
    if (month === null || month === undefined) {
      return BudgetLine.findOne({ where: { cost_center_id: costCenterId, year, month: null, category } });
    }
    return BudgetLine.findOne({ where: { cost_center_id: costCenterId, year, month, category } });
  }

  async createBudgetLine(data: Record<string, unknown>) {
    return BudgetLine.create(data);
  }

  async updateBudgetLine(id: number, data: Record<string, unknown>) {
    const line = await BudgetLine.findByPk(id);
    if (!line) return null;
    await line.update(data);
    return line;
  }

  async deleteBudgetLine(id: number, transaction?: Transaction) {
    await BudgetLine.destroy({ where: { id }, ...(transaction ? { transaction } : {}) });
  }

  // ---- Relatório Orçado × Realizado ----

  async getBudgetTotalsByCostCenter(year: number, month?: number | null, costCenterId?: number | null) {
    const costCenterFilter = costCenterId ? 'AND bl.cost_center_id = :costCenterId' : '';

    if (month) {
      // Linhas mensais daquele mês (valor cheio) + linhas anuais rateadas por 12.
      return sequelize.query(
        `SELECT bl.cost_center_id                                                          AS cost_center_id,
                cc.code                                                                     AS code,
                cc.name                                                                     AS name,
                COALESCE(SUM(
                  CASE
                    WHEN bl.month IS NULL THEN bl.planned_amount / 12.0
                    ELSE bl.planned_amount
                  END
                ), 0)::numeric                                                              AS planned_amount
           FROM budget_lines bl
           LEFT JOIN cost_centers cc ON cc.id = bl.cost_center_id
          WHERE bl.year = :year
            AND (bl.month = :month OR bl.month IS NULL)
            ${costCenterFilter}
          GROUP BY bl.cost_center_id, cc.code, cc.name`,
        { replacements: { year, month, costCenterId }, type: QueryTypes.SELECT }
      );
    }

    // Ano inteiro: linhas mensais + linhas anuais, todas pelo valor cheio.
    return sequelize.query(
      `SELECT bl.cost_center_id                                AS cost_center_id,
              cc.code                                           AS code,
              cc.name                                           AS name,
              COALESCE(SUM(bl.planned_amount), 0)::numeric      AS planned_amount
         FROM budget_lines bl
         LEFT JOIN cost_centers cc ON cc.id = bl.cost_center_id
        WHERE bl.year = :year
          ${costCenterFilter}
        GROUP BY bl.cost_center_id, cc.code, cc.name`,
      { replacements: { year, costCenterId }, type: QueryTypes.SELECT }
    );
  }
}

export = SequelizeBudgetRepository;
