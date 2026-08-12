/**
 * Implementação Sequelize/PostgreSQL do {@link DirectorateRepository}.
 *
 * @module modules/directorate/infrastructure/sequelize/SequelizeDirectorateRepository
 */

const DirectorateRepository = require('../../domain/repositories/DirectorateRepository');
const {
  Directorate, Department, Employee, StrategicPlanning, MeetingMinute, BusinessRisk,
} = require('../../../../models/index');

class SequelizeDirectorateRepository extends DirectorateRepository {
  // ---- Organograma / Diretorias ----

  async listDirectoratesWithDepartments() {
    return Directorate.findAll({
      where: { active: true },
      include: [
        { model: Employee, as: 'manager', attributes: ['id', 'name', 'position', 'status'], required: false },
        { model: Department, as: 'departments', attributes: ['id', 'code', 'name', 'sigla', 'active'], required: false },
      ],
      order: [['code', 'ASC']],
    });
  }

  async findDirectorateById(id: number) {
    return Directorate.findByPk(id);
  }

  async updateDirectorateManager(id: number, managerId: number | null) {
    const directorate = await Directorate.findByPk(id);
    if (!directorate) return null;
    await directorate.update({ manager_id: managerId });
    return directorate;
  }

  async findEmployeeById(id: number) {
    return Employee.findByPk(id);
  }

  // ---- Planejamento Estratégico ----

  async listStrategicPlannings(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.year) where.year = filters.year;
    if (filters.directorate_id) where.directorate_id = filters.directorate_id;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.status) where.status = filters.status;

    const { count, rows } = await StrategicPlanning.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['year', 'DESC'], ['id', 'DESC']],
    });

    return { rows, count };
  }

  async findStrategicPlanningById(id: number) {
    return StrategicPlanning.findByPk(id);
  }

  async createStrategicPlanning(data: Record<string, unknown>) {
    return StrategicPlanning.create(data);
  }

  async updateStrategicPlanning(id: number, data: Record<string, unknown>) {
    const planning = await StrategicPlanning.findByPk(id);
    if (!planning) return null;
    await planning.update(data);
    return planning;
  }

  // ---- Atas de Reunião ----

  async createMeetingMinute(data: Record<string, unknown>) {
    return MeetingMinute.create(data);
  }

  async listMeetingMinutes(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const { Op } = require('sequelize');
    const where: any = {};
    if (filters.meeting_type) where.meeting_type = filters.meeting_type;
    if (filters.from || filters.to) {
      where.meeting_date = {};
      if (filters.from) where.meeting_date[Op.gte] = filters.from;
      if (filters.to) where.meeting_date[Op.lte] = filters.to;
    }

    const { count, rows } = await MeetingMinute.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['meeting_date', 'DESC'], ['id', 'DESC']],
    });

    return { rows, count };
  }

  async findMeetingMinuteById(id: number) {
    return MeetingMinute.findByPk(id);
  }

  // ---- Riscos Corporativos ----

  async createBusinessRisk(data: Record<string, unknown>) {
    return BusinessRisk.create(data);
  }

  async updateBusinessRisk(id: number, data: Record<string, unknown>) {
    const risk = await BusinessRisk.findByPk(id);
    if (!risk) return null;
    await risk.update(data);
    return risk;
  }

  async listBusinessRisks(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.risk_category) where.risk_category = filters.risk_category;

    const { count, rows } = await BusinessRisk.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['risk_score', 'DESC'], ['id', 'DESC']],
    });

    return { rows, count };
  }

  async findBusinessRiskById(id: number) {
    return BusinessRisk.findByPk(id);
  }
}

export = SequelizeDirectorateRepository;
