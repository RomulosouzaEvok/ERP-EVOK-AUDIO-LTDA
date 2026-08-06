import type { Transaction } from 'sequelize';

const { QueryTypes } = require('sequelize');
const CostCenterRepository = require('../../domain/repositories/CostCenterRepository');
const { sequelize } = require('../../../../config/database');
const { CostCenter } = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `CostCenterRepository`.
 *
 * @module modules/financial/infrastructure/sequelize/SequelizeCostCenterRepository
 */
class SequelizeCostCenterRepository extends CostCenterRepository {
  /** @inheritdoc */
  async listCostCenters(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (typeof filters.active === 'boolean') where.active = filters.active;

    const { count, rows } = await CostCenter.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['code', 'ASC']],
    });

    return { rows, count };
  }

  /** @inheritdoc */
  async findCostCenterById(id: number | string) {
    return CostCenter.findByPk(id);
  }

  /** @inheritdoc */
  async findCostCenterByCode(code: string) {
    return CostCenter.findOne({ where: { code } });
  }

  /** @inheritdoc */
  async createCostCenter(data: Record<string, any>, transaction?: Transaction) {
    return CostCenter.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  async updateCostCenter(id: number | string, data: Record<string, any>) {
    const costCenter = await CostCenter.findByPk(id);
    if (!costCenter) return null;
    await costCenter.update(data);
    return costCenter;
  }

  /** @inheritdoc */
  async getCostCenterTotalsByReceivable(from: string, to: string) {
    return sequelize.query(
      `SELECT ar.cost_center_id                                    AS cost_center_id,
              cc.code                                               AS code,
              cc.name                                               AS name,
              COALESCE(SUM(ar.amount - ar.amount_paid), 0)::numeric AS open_amount,
              COALESCE(SUM(ar.amount_paid), 0)::numeric             AS realized_amount
         FROM accounts_receivable ar
         LEFT JOIN cost_centers cc ON cc.id = ar.cost_center_id
        WHERE ar.status != 'canceled'
          AND ar.due_date BETWEEN :from AND :to
        GROUP BY ar.cost_center_id, cc.code, cc.name`,
      { replacements: { from, to }, type: QueryTypes.SELECT }
    );
  }

  /** @inheritdoc */
  async getCostCenterTotalsByPayable(from: string, to: string) {
    return sequelize.query(
      `SELECT ap.cost_center_id                                    AS cost_center_id,
              cc.code                                               AS code,
              cc.name                                               AS name,
              COALESCE(SUM(ap.amount - ap.amount_paid), 0)::numeric AS open_amount,
              COALESCE(SUM(ap.amount_paid), 0)::numeric             AS realized_amount
         FROM accounts_payable ap
         LEFT JOIN cost_centers cc ON cc.id = ap.cost_center_id
        WHERE ap.status != 'canceled'
          AND ap.due_date BETWEEN :from AND :to
        GROUP BY ap.cost_center_id, cc.code, cc.name`,
      { replacements: { from, to }, type: QueryTypes.SELECT }
    );
  }
}

module.exports = SequelizeCostCenterRepository;
