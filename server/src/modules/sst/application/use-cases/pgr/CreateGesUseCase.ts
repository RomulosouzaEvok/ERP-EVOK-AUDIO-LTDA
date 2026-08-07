/**
 * Use case: criar um GES (Grupo de Exposição Similar) — RF-SST-039.
 *
 * @module modules/sst/application/use-cases/pgr/CreateGesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import PgrRepository from '../../../domain/repositories/PgrRepository';
import { ValidationError } from '../../../../../errors';
import { fromGesInput, toGesDTO } from '../../../infrastructure/mappers/PgrMapper';

interface CreateGesInput {
  body: Record<string, any>;
}

class CreateGesUseCase extends UseCase<CreateGesInput, any> {
  private readonly pgrRepository: PgrRepository;

  public constructor(pgrRepository: PgrRepository) {
    super();
    this.pgrRepository = pgrRepository;
  }

  /** @throws {ValidationError} `nome` ausente (400). */
  public async execute({ body }: CreateGesInput): Promise<any> {
    if (!body.nome) throw new ValidationError('nome é obrigatório.');
    const ges = await this.pgrRepository.createGes(fromGesInput(body));
    return toGesDTO(ges);
  }
}

export = CreateGesUseCase;
