/**
 * Use case: criar vínculo função/setor × TipoEPI na MatrizEPI (RF-SST-002).
 *
 * @module modules/sst/application/use-cases/epi/CreateEpiMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import { fromMatrizInput, toMatrizDTO } from '../../../infrastructure/mappers/EpiMapper';

class CreateEpiMatrixUseCase extends UseCase<{ body: Record<string, any> }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ body }` com `position` e/ou `department_id`, e `epi_type_id`.
   * @returns Vínculo criado.
   * @throws {ValidationError} Se `position` e `department_id` estiverem ambos ausentes, ou `epi_type_id` ausente (400).
   * @throws {NotFoundError} Se `epi_type_id` não existir (404).
   */
  public async execute({ body }: { body: Record<string, any> }): Promise<any> {
    if (!body.position && !body.department_id) {
      throw new ValidationError('Informe ao menos um de position ou department_id.');
    }
    if (!body.epi_type_id) {
      throw new ValidationError('epi_type_id é obrigatório.');
    }
    const tipo = await this.epiRepository.findTipoById(body.epi_type_id);
    if (!tipo) throw new NotFoundError('Tipo de EPI informado não existe.');

    const matriz = await this.epiRepository.createMatriz(fromMatrizInput(body));
    return toMatrizDTO(matriz);
  }
}

export = CreateEpiMatrixUseCase;
