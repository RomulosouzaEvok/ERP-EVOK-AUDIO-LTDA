/**
 * Use case: emitir Permissão de Trabalho (PT) com janela de validade
 * (RF-SST-051).
 *
 * @module modules/sst/application/use-cases/safetyRoutine/CreateWorkPermitUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { ValidationError } from '../../../../../errors';
import { toWorkPermitDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

interface CreateWorkPermitInput {
  body: {
    atividade: string;
    tipo_risco: string;
    department_id: number;
    requisitos_verificados?: string[] | string;
    inicio_validade: string;
    fim_validade: string;
    executantes?: number[];
  };
  autorizanteId: number;
}

class CreateWorkPermitUseCase extends UseCase<CreateWorkPermitInput, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} Campos obrigatórios ausentes ou `fim_validade` <= `inicio_validade` (400). */
  public async execute({ body, autorizanteId }: CreateWorkPermitInput): Promise<any> {
    const { atividade, tipo_risco, department_id, inicio_validade, fim_validade } = body;
    if (!atividade || !tipo_risco || !department_id || !inicio_validade || !fim_validade) {
      throw new ValidationError('atividade, tipo_risco, department_id, inicio_validade e fim_validade são obrigatórios.');
    }
    if (new Date(fim_validade) <= new Date(inicio_validade)) {
      throw new ValidationError('fim_validade deve ser posterior a inicio_validade.');
    }

    const requisitos = Array.isArray(body.requisitos_verificados) ? body.requisitos_verificados.join('|') : (body.requisitos_verificados ?? null);
    const pt = await this.repository.createWorkPermit({
      atividade, tipo_risco, department_id,
      requisitos_verificados: requisitos,
      autorizante_id: autorizanteId,
      inicio_validade, fim_validade,
      status: 'emitida'
    });

    await this.repository.createWorkPermitExecutants(pt.id, Array.isArray(body.executantes) ? body.executantes : []);
    return toWorkPermitDTO(pt);
  }
}

export = CreateWorkPermitUseCase;
