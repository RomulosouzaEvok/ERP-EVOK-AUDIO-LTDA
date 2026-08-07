/**
 * Use case: criar Ação Corretiva diretamente (usado quando a origem não
 * gera automaticamente, ex.: deliberação de ReuniaoCIPA sem o payload
 * `acoes_corretivas` embutido em `POST /cipa/meetings`).
 *
 * @module modules/sst/application/use-cases/correctiveAction/CreateCorrectiveActionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorrectiveActionRepository from '../../../domain/repositories/CorrectiveActionRepository';
import { ValidationError } from '../../../../../errors';
import { fromCorrectiveActionInput, toCorrectiveActionDTO } from '../../../infrastructure/mappers/CorrectiveActionMapper';

const ORIGENS = ['investigacao_acidente', 'reuniao_cipa', 'inspecao_seguranca', 'pgr'];

interface CreateCorrectiveActionInput {
  body: Record<string, any>;
  createdBy: number;
}

class CreateCorrectiveActionUseCase extends UseCase<CreateCorrectiveActionInput, any> {
  private readonly repository: CorrectiveActionRepository;

  public constructor(repository: CorrectiveActionRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} Campos obrigatórios ausentes ou `origem` inválida (400). */
  public async execute({ body, createdBy }: CreateCorrectiveActionInput): Promise<any> {
    const { origem, origem_id, descricao, responsavel_id, prazo } = body;
    if (!origem || !origem_id || !descricao || !responsavel_id || !prazo) {
      throw new ValidationError('origem, origem_id, descricao, responsavel_id e prazo são obrigatórios.');
    }
    if (!ORIGENS.includes(origem)) throw new ValidationError(`origem inválida. Valores aceitos: ${ORIGENS.join(', ')}.`);

    const acao = await this.repository.create({
      ...fromCorrectiveActionInput(body),
      status: 'aberta',
      created_by: createdBy
    });
    return toCorrectiveActionDTO(acao);
  }
}

export = CreateCorrectiveActionUseCase;
