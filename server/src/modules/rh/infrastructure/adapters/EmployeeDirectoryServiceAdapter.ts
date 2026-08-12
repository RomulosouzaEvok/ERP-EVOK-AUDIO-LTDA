/**
 * Adapter Sequelize de `EmployeeDirectoryService` — única porta do módulo
 * RH para a tabela `employees` (módulo `employees`, já em produção).
 *
 * Nenhuma regra de negócio vive aqui: validação de CPF, gates de ASO,
 * limites de férias etc. ficam nos use cases; este arquivo só traduz a
 * intenção declarada pela interface em chamadas de model.
 *
 * `work_regime`: o ENUM real de `employees.work_regime` (já em produção) é
 * `clt|pj|estagiario|aprendiz` — **não** aceita `'experiencia'`, que é tipo
 * de CONTRATO (`hr_employee_contracts.type`), não regime de trabalho. O
 * exemplo de payload de §4.3 do contrato de API sugeria o contrário; a
 * validação correta é feita no validator/use case de admissão.
 *
 * @module modules/rh/infrastructure/adapters/EmployeeDirectoryServiceAdapter
 */
import EmployeeDirectoryService from '../../application/services/EmployeeDirectoryService';
import { CreateEmployeeFromAdmissionData, ActiveEmployeeWithJobPosition } from '../../application/services/EmployeeDirectoryTypes';

const { Employee }: any = require('../../../../models/index');

class EmployeeDirectoryServiceAdapter extends EmployeeDirectoryService {
  public async findById(employeeId: number | string, transaction?: unknown): Promise<any | null> {
    return Employee.findByPk(employeeId, { transaction: transaction as any });
  }

  /** `status='active'` é literal do ENUM de `employees.status` (`active|inactive|fired|vacation|license`). */
  public async countActiveByDepartment(departmentId: number | string): Promise<number> {
    return Employee.count({ where: { department_id: departmentId, status: 'active' } });
  }

  public async create(data: CreateEmployeeFromAdmissionData, transaction?: unknown): Promise<any> {
    return Employee.create({ ...data, status: 'active' }, { transaction: transaction as any });
  }

  public async markAsTerminated(employeeId: number | string, dismissalDate: string, transaction?: unknown): Promise<void> {
    await Employee.update(
      { status: 'fired', dismissal_date: dismissalDate },
      { where: { id: employeeId }, transaction: transaction as any },
    );
  }

  public async updateStatus(employeeId: number | string, status: string, transaction?: unknown): Promise<void> {
    await Employee.update(
      { status },
      { where: { id: employeeId }, transaction: transaction as any },
    );
  }

  public async listActiveWithJobPosition(departmentId?: number | string | null): Promise<ActiveEmployeeWithJobPosition[]> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = { status: 'active', job_position_id: { [Op.ne]: null } };
    if (departmentId !== undefined && departmentId !== null) where.department_id = departmentId;
    const rows = await Employee.findAll({ where, attributes: ['id', 'name', 'department_id', 'job_position_id'] });
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      department_id: row.department_id,
      job_position_id: row.job_position_id,
    }));
  }
}

export = EmployeeDirectoryServiceAdapter;
