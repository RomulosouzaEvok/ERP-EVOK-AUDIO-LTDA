/**
 * Implementação Sequelize do repositório de `HrEmployeeTraining`.
 * @module modules/rh/infrastructure/sequelize/SequelizeEmployeeTrainingRepository
 */
import EmployeeTrainingRepository from '../../domain/repositories/EmployeeTrainingRepository';

const { HrEmployeeTraining, HrTrainingCourse, Employee }: any = require('../../../../models/index');

class SequelizeEmployeeTrainingRepository extends EmployeeTrainingRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.training_course_id) where.training_course_id = filters.training_course_id;
    if (filters.expiring_in_days !== undefined) {
      const limit = new Date();
      limit.setUTCDate(limit.getUTCDate() + Number(filters.expiring_in_days));
      where.valid_until = { [Op.ne]: null, [Op.lte]: limit.toISOString().slice(0, 10) };
    }
    const employeeInclude: any = { model: Employee, as: 'employee' };
    if (filters.department_id) employeeInclude.where = { department_id: filters.department_id };
    return HrEmployeeTraining.findAndCountAll({
      where,
      include: [{ model: HrTrainingCourse, as: 'trainingCourse' }, employeeInclude],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['completed_at', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrEmployeeTraining.findByPk(id, { include: [{ model: HrTrainingCourse, as: 'trainingCourse' }] });
  }

  public async create(data: Record<string, unknown>) {
    return HrEmployeeTraining.create(data);
  }

  public async findLatestByEmployeeAndCourse(employeeId: number | string, trainingCourseId: number | string) {
    return HrEmployeeTraining.findOne({
      where: { employee_id: employeeId, training_course_id: trainingCourseId },
      order: [['completed_at', 'DESC']],
    });
  }
}

export = SequelizeEmployeeTrainingRepository;
