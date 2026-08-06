/**
 * Busca um processo de importacao pelo id, com itens/fornecedor/criador
 * carregados, cobrindo o endpoint `GET /api/comex/import-processes/:id`.
 *
 * @module modules/comex/application/use-cases/GetImportProcessByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';

interface GetImportProcessByIdInput {
  id: number;
}

class GetImportProcessByIdUseCase extends UseCase<GetImportProcessByIdInput, any> {
  private readonly comexRepository: ComexRepository;

  public constructor(comexRepository: ComexRepository) {
    super();
    this.comexRepository = comexRepository;
  }

  public async execute({ id }: GetImportProcessByIdInput): Promise<any> {
    const importProcess = await this.comexRepository.findImportProcessById(id);
    if (!importProcess) {
      throw new NotFoundError('Processo de importacao nao encontrado.');
    }
    return importProcess;
  }
}

export = GetImportProcessByIdUseCase;
