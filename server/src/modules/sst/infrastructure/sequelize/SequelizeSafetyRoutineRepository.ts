/**
 * Implementação Sequelize do repositório do cluster Rotina Preventiva
 * (Inspeções, PT, Brigada, DDS).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeSafetyRoutineRepository
 */

import SafetyRoutineRepository from '../../domain/repositories/SafetyRoutineRepository';

const {
  SstInspecaoSeguranca, SstInspecaoItem, SstAcaoCorretiva,
  SstPermissaoTrabalho, SstPtExecutante,
  SstBrigadista, SstRegistroDds, SstDdsPresenca
}: any = require('../../../../models/index');

class SequelizeSafetyRoutineRepository extends SafetyRoutineRepository {
  /** @inheritdoc */
  public async findInspectionsAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.data) where.data = filters.data;
    const include: any[] = [{ model: SstInspecaoItem, as: 'itens' }];
    const { rows, count } = await SstInspecaoSeguranca.findAndCountAll({ where, include, limit: pagination.limit, offset: pagination.offset, order: [['data', 'DESC']], distinct: true });
    const filtradas = filters.tem_nc === 'true'
      ? rows.filter((r: any) => (r.itens ?? []).some((i: any) => !i.conforme))
      : rows;
    return { count: filters.tem_nc === 'true' ? filtradas.length : count, rows: filtradas };
  }

  /** @inheritdoc */
  public async findInspectionById(id: number | string): Promise<any | null> {
    return SstInspecaoSeguranca.findByPk(id, { include: [{ model: SstInspecaoItem, as: 'itens' }] });
  }

  /** @inheritdoc */
  public async createInspection(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstInspecaoSeguranca.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createInspectionItem(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstInspecaoItem.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createCorrectiveAction(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstAcaoCorretiva.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async updateInspectionItem(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const item = await SstInspecaoItem.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!item) return null;
    await item.update(data, transaction ? { transaction } : undefined);
    return item;
  }

  /** @inheritdoc */
  public async findWorkPermitsAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.status) where.status = filters.status;
    return SstPermissaoTrabalho.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findWorkPermitById(id: number | string): Promise<any | null> {
    return SstPermissaoTrabalho.findByPk(id, { include: [{ model: SstPtExecutante, as: 'executantes' }] });
  }

  /** @inheritdoc */
  public async createWorkPermit(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstPermissaoTrabalho.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createWorkPermitExecutants(permissaoTrabalhoId: number, employeeIds: number[], transaction?: any): Promise<void> {
    if (!employeeIds || employeeIds.length === 0) return;
    await SstPtExecutante.bulkCreate(
      employeeIds.map((employeeId) => ({ permissao_trabalho_id: permissaoTrabalhoId, employee_id: employeeId })),
      transaction ? { transaction } : undefined
    );
  }

  /** @inheritdoc */
  public async updateWorkPermitStatus(id: number | string, status: string, transaction?: any): Promise<any> {
    const pt = await SstPermissaoTrabalho.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!pt) return null;
    await pt.update({ status }, transaction ? { transaction } : undefined);
    return pt;
  }

  /** @inheritdoc */
  public async findBrigadeAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.active !== undefined) where.ativo = filters.active === 'true';
    return SstBrigadista.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findBrigadeMemberById(id: number | string): Promise<any | null> {
    return SstBrigadista.findByPk(id);
  }

  /** @inheritdoc */
  public async createBrigadeMember(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstBrigadista.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async updateBrigadeMember(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const brigadista = await SstBrigadista.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!brigadista) return null;
    await brigadista.update(data, transaction ? { transaction } : undefined);
    return brigadista;
  }

  /** @inheritdoc */
  public async findDdsAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.department_id) where.department_id = filters.department_id;
    return SstRegistroDds.findAndCountAll({ where, include: [{ model: SstDdsPresenca, as: 'presencas' }], limit: pagination.limit, offset: pagination.offset, order: [['data', 'DESC']] });
  }

  /** @inheritdoc */
  public async createDds(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstRegistroDds.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createDdsAttendees(registroDdsId: number, employeeIds: number[], transaction?: any): Promise<void> {
    if (!employeeIds || employeeIds.length === 0) return;
    await SstDdsPresenca.bulkCreate(
      employeeIds.map((employeeId) => ({ registro_dds_id: registroDdsId, employee_id: employeeId })),
      transaction ? { transaction } : undefined
    );
  }
}

export = SequelizeSafetyRoutineRepository;
