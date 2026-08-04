/**
 * Implementacao Sequelize/PostgreSQL do {@link LaboratoryRepository}.
 *
 * @module modules/laboratory/infrastructure/sequelize/SequelizeLaboratoryRepository
 */

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../../config/database');
const LaboratoryRepository = require('../../domain/repositories/LaboratoryRepository');
const { AcousticTestResult, Product, User } = require('../../../../models/index');

class SequelizeLaboratoryRepository extends LaboratoryRepository {
  async createTest(data: Record<string, unknown>, transaction?: any) {
    return AcousticTestResult.create(data, transaction ? { transaction } : undefined);
  }

  async updateTest(id: number, data: Record<string, unknown>, transaction?: any) {
    const test = await AcousticTestResult.findByPk(id, transaction ? { transaction } : undefined);
    if (!test) return null;
    await test.update(data, transaction ? { transaction } : undefined);
    return this.findTestById(id);
  }

  async findTestById(id: number) {
    return AcousticTestResult.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'tester', attributes: ['id', 'name'] },
      ],
    });
  }

  async listTests(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const { Op } = require('sequelize');
    const where: any = {};
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.test_type) where.test_type = filters.test_type;
    if (typeof filters.passed === 'boolean') where.passed = filters.passed;
    if (filters.serial_number) where.serial_number = filters.serial_number;
    if (filters.start_date || filters.end_date) {
      where.test_date = {};
      if (filters.start_date) where.test_date[Op.gte] = filters.start_date;
      if (filters.end_date) where.test_date[Op.lte] = filters.end_date;
    }

    const { count, rows } = await AcousticTestResult.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'tester', attributes: ['id', 'name'] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['test_date', 'DESC']],
      distinct: true,
    });

    return { rows, count };
  }

  async getSummary(filters: { product_id?: number; days: number }) {
    const params: Record<string, unknown> = { days: filters.days };
    let productFilter = '';
    if (filters.product_id) {
      productFilter = 'AND product_id = :product_id';
      params.product_id = filters.product_id;
    }

    return sequelize.query(
      `SELECT test_type,
              COUNT(*)::int                                                       AS total,
              COUNT(*) FILTER (WHERE passed = true)::int                          AS passed,
              COUNT(*) FILTER (WHERE passed = false)::int                         AS failed,
              CASE WHEN COUNT(*) = 0 THEN 0
                   ELSE ROUND(COUNT(*) FILTER (WHERE passed = true)::numeric / COUNT(*) * 100, 2)
              END::float                                                          AS pass_rate
         FROM acoustic_test_results
        WHERE test_date >= (NOW() - (:days || ' days')::interval)
          ${productFilter}
        GROUP BY test_type
        ORDER BY test_type`,
      { type: QueryTypes.SELECT, replacements: params }
    );
  }
}

export = SequelizeLaboratoryRepository;
