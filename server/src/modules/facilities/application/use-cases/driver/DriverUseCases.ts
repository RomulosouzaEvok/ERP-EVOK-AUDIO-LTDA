/**
 * Casos de uso de Condutor (Autorização de Condução — RF-FAC-011 a 015),
 * cobrindo `/api/facilities/drivers`.
 *
 * @module modules/facilities/application/use-cases/driver/DriverUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError, ValidationError } from '../../../../../errors';
import DriverRepository from '../../../domain/repositories/DriverRepository';

/** `GET /api/facilities/drivers` */
export class ListDriversUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly driverRepository: DriverRepository) {
    super();
  }

  async execute({ authorized, cnh_expiring, employee_id, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.driverRepository.list({ authorized, cnh_expiring, employee_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `GET /api/facilities/drivers/:id` */
export class GetDriverByIdUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly driverRepository: DriverRepository) {
    super();
  }

  async execute({ id }: { id: number }) {
    const driver = await this.driverRepository.findById(id);
    if (!driver) throw new NotFoundError('Condutor não encontrado.');
    return driver;
  }
}

/** `POST /api/facilities/drivers` — condutor terceirizado fora de escopo P0, `employee_id` obrigatório. */
export class CreateDriverUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly driverRepository: DriverRepository) {
    super();
  }

  /**
   * @throws {ValidationError} Se `employee_id`, `cnh_number`, `cnh_category` ou `cnh_valid_until` ausentes.
   * @throws {ConflictError} Se `employee_id` já cadastrado como condutor.
   */
  async execute(input: Record<string, any>) {
    const { employee_id, cnh_number, cnh_category, cnh_valid_until } = input;
    if (!employee_id || !cnh_number || !cnh_category || !cnh_valid_until) {
      throw new ValidationError('employee_id, cnh_number, cnh_category e cnh_valid_until são obrigatórios.');
    }

    const existing = await this.driverRepository.findByEmployeeId(employee_id);
    if (existing) throw new ConflictError('Este funcionário já está cadastrado como condutor.');

    return this.driverRepository.create({
      employee_id,
      cnh_number,
      cnh_category,
      cnh_valid_until,
      cnh_file_path: input.cnh_file_path ?? null,
      authorized: false,
    });
  }
}

/** `PUT /api/facilities/drivers/:id` — atualiza CNH. */
export class UpdateDriverUseCase extends UseCase<{ id: number } & Record<string, any>, any> {
  constructor(private readonly driverRepository: DriverRepository) {
    super();
  }

  async execute({ id, ...rest }: { id: number } & Record<string, any>) {
    const current = await this.driverRepository.findById(id);
    if (!current) throw new NotFoundError('Condutor não encontrado.');

    const allowed = ['cnh_number', 'cnh_category', 'cnh_valid_until', 'cnh_file_path'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowed) {
      if (rest[field] !== undefined) updateData[field] = rest[field];
    }

    return this.driverRepository.update(id, updateData);
  }
}

/** `POST /api/facilities/drivers/:id/authorize` */
export class AuthorizeDriverUseCase extends UseCase<{ id: number; authorizedBy: number }, any> {
  constructor(private readonly driverRepository: DriverRepository) {
    super();
  }

  async execute({ id, authorizedBy }: { id: number; authorizedBy: number }) {
    const driver = await this.driverRepository.findById(id);
    if (!driver) throw new NotFoundError('Condutor não encontrado.');

    return this.driverRepository.update(id, { authorized: true, authorized_by: authorizedBy, authorized_at: new Date() });
  }
}

/** `POST /api/facilities/drivers/:id/suspend` — nível approve (RF-FAC-015). */
export class SuspendDriverUseCase extends UseCase<{ id: number; suspension_reason: string; suspendedBy: number }, any> {
  constructor(private readonly driverRepository: DriverRepository) {
    super();
  }

  /** @throws {ValidationError} Se `suspension_reason` ausente. */
  async execute({ id, suspension_reason, suspendedBy }: { id: number; suspension_reason: string; suspendedBy: number }) {
    if (!suspension_reason) throw new ValidationError('suspension_reason é obrigatório.');

    const driver = await this.driverRepository.findById(id);
    if (!driver) throw new NotFoundError('Condutor não encontrado.');

    return this.driverRepository.update(id, {
      authorized: false,
      notes: `[Suspenso por usuário #${suspendedBy}] ${suspension_reason}`,
    });
  }
}
