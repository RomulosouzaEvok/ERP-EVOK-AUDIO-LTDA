/**
 * Implementação Sequelize do repositório de `HrTrainingCourse`.
 * @module modules/rh/infrastructure/sequelize/SequelizeTrainingCourseRepository
 */
import TrainingCourseRepository from '../../domain/repositories/TrainingCourseRepository';

const { HrTrainingCourse, HrJobPositionTraining }: any = require('../../../../models/index');

class SequelizeTrainingCourseRepository extends TrainingCourseRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.is_normative !== undefined) where.is_normative = filters.is_normative;
    if (filters.active !== undefined) where.active = filters.active;
    return HrTrainingCourse.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['name', 'ASC']],
    });
  }

  public async findById(id: number | string) {
    return HrTrainingCourse.findByPk(id);
  }

  public async create(data: Record<string, unknown>) {
    return HrTrainingCourse.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>) {
    const record = await HrTrainingCourse.findByPk(id);
    if (!record) return null;
    await record.update(data);
    return record;
  }

  public async listRequiredByJobPosition(jobPositionId: number | string) {
    return HrJobPositionTraining.findAll({
      where: { job_position_id: jobPositionId, required: true },
      include: [{ model: HrTrainingCourse, as: 'trainingCourse' }],
    });
  }
}

export = SequelizeTrainingCourseRepository;
