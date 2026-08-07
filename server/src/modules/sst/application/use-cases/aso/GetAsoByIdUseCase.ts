/**
 * Use case: detalhe completo de um ASO (dado clínico — RNF-SST-05: o
 * controller deve gerar log de leitura ao chamar este use case).
 *
 * @module modules/sst/application/use-cases/aso/GetAsoByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { NotFoundError } from '../../../../../errors';
import { toAsoDetailDTO } from '../../../infrastructure/mappers/AsoMapper';

class GetAsoByIdUseCase extends UseCase<{ id: string | number }, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /** @throws {NotFoundError} Se não existir. */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const aso = await this.asoRepository.findAsoById(id);
    if (!aso) throw new NotFoundError('ASO não encontrado.');
    return toAsoDetailDTO(aso);
  }
}

export = GetAsoByIdUseCase;
