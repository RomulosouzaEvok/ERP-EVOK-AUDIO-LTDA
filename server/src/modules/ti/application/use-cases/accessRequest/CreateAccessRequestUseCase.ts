/**
 * `POST /api/ti/access-requests` — cria solicitação `grant`/`change`/
 * `revoke` (UC-51, RF-TI-031 a 033). `revoke` não exige
 * `requested_profile_id` nem aprovação — vai direto a `pending`, elegível
 * para `execute` imediatamente (RF-TI-034).
 *
 * @module modules/ti/application/use-cases/accessRequest/CreateAccessRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { CreateAccessRequestInput } from '../../../domain/entities/AccessRequestTypes';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';

const { Employee, Department, AccessProfile }: any = require('../../../../../models/index');

class CreateAccessRequestUseCase extends UseCase<CreateAccessRequestInput, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `type`/`employee_id` ausentes; `grant`/`change` sem `requested_profile_id`.
   * @throws {NotFoundError} `employee_id`/`department_id`/`requested_profile_id` não existe.
   */
  public async execute(input: CreateAccessRequestInput): Promise<any> {
    if (!input.type || !input.employee_id) throw new ValidationError('type e employee_id são obrigatórios.');
    if (['grant', 'change'].includes(input.type) && !input.requested_profile_id) {
      throw new ValidationError('requested_profile_id é obrigatório para solicitações do tipo "grant"/"change".');
    }

    const employee = await Employee.findByPk(input.employee_id);
    if (!employee) throw new NotFoundError(`Funcionário ${input.employee_id} não encontrado.`);

    const departmentId = input.department_id ?? employee.department_id;
    const department = await Department.findByPk(departmentId);
    if (!department) throw new NotFoundError(`Departamento ${departmentId} não encontrado.`);

    if (input.requested_profile_id) {
      const profile = await AccessProfile.findByPk(input.requested_profile_id);
      if (!profile) throw new NotFoundError(`Perfil de acesso ${input.requested_profile_id} não encontrado.`);
    }

    const year = new Date().getFullYear();
    const sequence = (await this.repository.countByYear(year)) + 1;

    const created = await this.repository.create({
      request_number: `AR-${year}-${String(sequence).padStart(4, '0')}`,
      type: input.type,
      employee_id: input.employee_id,
      requested_by: input.requestedBy,
      department_id: departmentId,
      requested_profile_id: input.requested_profile_id ?? null,
      justification: input.justification ?? null,
      corporate_email: input.corporate_email ?? null,
      equipment_needed: input.equipment_needed ?? null,
      checklist: input.type === 'revoke' ? (input.checklist ?? { user_deactivated: false, email_revoked: false, equipment_collected: false, files_transferred: false }) : null,
      status: 'pending',
    });

    return toAccessRequestDTO(await this.repository.findById(created.id));
  }
}

export = CreateAccessRequestUseCase;
