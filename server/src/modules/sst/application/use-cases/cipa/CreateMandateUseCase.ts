/**
 * Use case: criar um mandato da CIPA (a partir de eleição encerrada ou
 * designação direta) — RF-SST-030, UC-48.
 *
 * @module modules/sst/application/use-cases/cipa/CreateMandateUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { ValidationError } from '../../../../../errors';
import { fromMandateInput, toMandateDTO } from '../../../infrastructure/mappers/CipaMapper';

interface CreateMandateInput {
  body: Record<string, any>;
}

class CreateMandateUseCase extends UseCase<CreateMandateInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /** @throws {ValidationError} Campos obrigatórios ausentes (400). */
  public async execute({ body }: CreateMandateInput): Promise<any> {
    const { data_inicio, data_fim, titulares_empregador, titulares_empregados, suplentes_empregador, suplentes_empregados } = body;
    if (!data_inicio || !data_fim || titulares_empregador == null || titulares_empregados == null || suplentes_empregador == null || suplentes_empregados == null) {
      throw new ValidationError('data_inicio, data_fim, titulares_empregador, titulares_empregados, suplentes_empregador e suplentes_empregados são obrigatórios.');
    }
    if (new Date(data_fim) <= new Date(data_inicio)) {
      throw new ValidationError('data_fim deve ser posterior a data_inicio.');
    }
    const mandato = await this.cipaRepository.createMandate(fromMandateInput(body));
    return toMandateDTO(mandato);
  }
}

export = CreateMandateUseCase;
