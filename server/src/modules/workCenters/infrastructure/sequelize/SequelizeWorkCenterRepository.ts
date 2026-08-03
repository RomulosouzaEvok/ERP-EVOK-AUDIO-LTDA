/**
 * Implementacao Sequelize/PostgreSQL do {@link WorkCenterRepository}.
 *
 * @module modules/workCenters/infrastructure/sequelize/SequelizeWorkCenterRepository
 */

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../../config/database');
const WorkCenterRepository = require('../../domain/repositories/WorkCenterRepository');
const { WorkCenter, WorkCenterShift } = require('../../../../models/index');

class SequelizeWorkCenterRepository extends WorkCenterRepository {
  async listWorkCenters(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (typeof filters.active === 'boolean') where.active = filters.active;

    const { count, rows } = await WorkCenter.findAndCountAll({
      where,
      include: [{ model: WorkCenterShift, as: 'shifts' }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['code', 'ASC']],
      distinct: true,
    });

    return { rows, count };
  }

  async findWorkCenterById(id: number) {
    return WorkCenter.findByPk(id, {
      include: [{ model: WorkCenterShift, as: 'shifts' }],
    });
  }

  async findWorkCenterByCode(code: string) {
    return WorkCenter.findOne({ where: { code } });
  }

  async createWorkCenter(data: Record<string, unknown>, transaction?: any) {
    return WorkCenter.create(data, transaction ? { transaction } : undefined);
  }

  async updateWorkCenter(id: number, data: Record<string, unknown>, transaction?: any) {
    const workCenter = await WorkCenter.findByPk(id, transaction ? { transaction } : undefined);
    if (!workCenter) return null;
    await workCenter.update(data, transaction ? { transaction } : undefined);
    return this.findWorkCenterById(id);
  }

  async deleteShiftsByWorkCenter(workCenterId: number, transaction: any) {
    await WorkCenterShift.destroy({ where: { work_center_id: workCenterId }, transaction });
  }

  async createShift(data: Record<string, unknown>, transaction: any) {
    return WorkCenterShift.create(data, { transaction });
  }

  async listActiveWorkCentersWithShifts() {
    return WorkCenter.findAll({
      where: { active: true },
      include: [{ model: WorkCenterShift, as: 'shifts' }],
      order: [['code', 'ASC']],
    });
  }

  /**
   * Agrega a carga de horas pendente por centro de trabalho.
   *
   * Caminho do schema seguido: `production_orders.product_id` ->
   * `production_routes.product_id` -> `production_route_steps.production_route_id`,
   * filtrando etapas por `work_center_id` (centro de trabalho estruturado).
   * Quando o mesmo produto tem mais de um roteiro (ex.: revisoes), todos os
   * roteiros compativeis com o produto entram na soma — nao ha coluna que
   * amarre a OP a uma revisao especifica de roteiro no schema atual.
   *
   * Formula por etapa: `GREATEST(quantity - quantity_produced, 0) *
   * (standard_time_minutes + setup_time_minutes) / 60`. O `setup_time_minutes`
   * e contado uma vez por etapa (nao por unidade), conforme especificado.
   */
  async aggregateLoadByWorkCenter(): Promise<Array<{ work_center_id: number; load_hours: number; steps_count: number }>> {
    return sequelize.query(
      `SELECT prs.work_center_id                                            AS work_center_id,
              COALESCE(SUM(
                GREATEST(po.quantity - po.quantity_produced, 0)
                * (prs.standard_time_minutes + prs.setup_time_minutes)
              ) / 60.0, 0)::float                                           AS load_hours,
              COUNT(*)::int                                                 AS steps_count
         FROM production_orders po
         JOIN production_routes pr ON pr.product_id = po.product_id
         JOIN production_route_steps prs ON prs.production_route_id = pr.id
        WHERE po.status IN ('planned', 'released', 'in_progress', 'paused')
          AND prs.work_center_id IS NOT NULL
          AND prs.is_active = true
        GROUP BY prs.work_center_id`,
      { type: QueryTypes.SELECT }
    );
  }
}

export = SequelizeWorkCenterRepository;
