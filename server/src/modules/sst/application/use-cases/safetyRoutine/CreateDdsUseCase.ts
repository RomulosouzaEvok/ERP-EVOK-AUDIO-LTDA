/**
 * Use case: registrar DDS (tema, condutor, lista de presença) — RF-SST-053.
 *
 * @module modules/sst/application/use-cases/safetyRoutine/CreateDdsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { ValidationError } from '../../../../../errors';
import { toDdsDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

interface CreateDdsInput {
  body: {
    department_id: number;
    data?: string;
    turno?: string;
    tema: string;
    condutor_id: number;
    presentes?: number[];
  };
}

class CreateDdsUseCase extends UseCase<CreateDdsInput, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `department_id`, `tema` ou `condutor_id` ausentes (400). */
  public async execute({ body }: CreateDdsInput): Promise<any> {
    if (!body.department_id || !body.tema || !body.condutor_id) {
      throw new ValidationError('department_id, tema e condutor_id são obrigatórios.');
    }
    const registro = await this.repository.createDds({
      department_id: body.department_id,
      data: body.data ?? new Date().toISOString().slice(0, 10),
      turno: body.turno ?? null,
      tema: body.tema,
      condutor_id: body.condutor_id
    });
    await this.repository.createDdsAttendees(registro.id, Array.isArray(body.presentes) ? body.presentes : []);
    return toDdsDTO(registro);
  }
}

export = CreateDdsUseCase;
