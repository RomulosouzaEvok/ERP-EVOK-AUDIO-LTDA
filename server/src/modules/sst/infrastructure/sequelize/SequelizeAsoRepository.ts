/**
 * Implementação Sequelize do repositório do cluster ASO/PCMSO (NR-7).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeAsoRepository
 */

import AsoRepository from '../../domain/repositories/AsoRepository';

const { SstPlanoExames, SstAso, SstExameComplementar, Employee }: any = require('../../../../models/index');
const { Op } = require('sequelize');

class SequelizeAsoRepository extends AsoRepository {
  /** @inheritdoc */
  public async findExamPlansAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.position) where.position = filters.position;
    if (filters.ges_id) where.ges_id = filters.ges_id;
    return SstPlanoExames.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async createExamPlan(data: Record<string, unknown>): Promise<any> {
    return SstPlanoExames.create(data);
  }

  /** @inheritdoc */
  public async updateExamPlan(id: number | string, data: Record<string, unknown>): Promise<any> {
    const plano = await SstPlanoExames.findByPk(id);
    if (!plano) return null;
    await plano.update(data);
    return plano;
  }

  /** @inheritdoc */
  public async findApplicableExamPlan(position: string | null, gesId: number | null): Promise<any | null> {
    const where: Record<string, unknown> = { ativo: true };
    const or: Record<string, unknown>[] = [];
    if (position) or.push({ position });
    if (gesId) or.push({ ges_id: gesId });
    if (or.length === 0) return null;
    where[Op.or as any] = or;
    return SstPlanoExames.findOne({ where });
  }

  /** @inheritdoc */
  public async findAsosAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.resultado) where.resultado = filters.resultado;
    if (filters.vencendo_em_dias) {
      const limite = new Date();
      limite.setDate(limite.getDate() + Number(filters.vencendo_em_dias));
      where.data_vencimento = { [Op.lte]: limite, [Op.ne]: null };
    }
    return SstAso.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['data_realizacao', 'DESC']] });
  }

  /** @inheritdoc */
  public async findAsoById(id: number | string): Promise<any | null> {
    return SstAso.findByPk(id, { include: [{ model: SstExameComplementar, as: 'exames_complementares' }] });
  }

  /** @inheritdoc */
  public async findLatestAsoByEmployee(employeeId: number): Promise<any | null> {
    return SstAso.findOne({ where: { employee_id: employeeId }, order: [['data_realizacao', 'DESC']] });
  }

  /** @inheritdoc */
  public async createAso(data: Record<string, unknown>): Promise<any> {
    return SstAso.create(data);
  }

  /** @inheritdoc */
  public async createComplementaryExam(data: Record<string, unknown>): Promise<any> {
    return SstExameComplementar.create(data);
  }

  /** @inheritdoc */
  public async findEmployeeById(employeeId: number): Promise<any | null> {
    return Employee.findByPk(employeeId);
  }
}

export = SequelizeAsoRepository;
