/**
 * Use case: atualizar status/evidência de conclusão de uma Ação Corretiva.
 *
 * @module modules/sst/application/use-cases/correctiveAction/UpdateCorrectiveActionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorrectiveActionRepository from '../../../domain/repositories/CorrectiveActionRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import { toCorrectiveActionDTO } from '../../../infrastructure/mappers/CorrectiveActionMapper';

const STATUSES = ['aberta', 'em_andamento', 'concluida'];

interface UpdateCorrectiveActionInput {
  id: string | number;
  body: { status?: string; evidencia_conclusao_url?: string; descricao?: string; prazo?: string; responsavel_id?: number };
}

class UpdateCorrectiveActionUseCase extends UseCase<UpdateCorrectiveActionInput, any> {
  private readonly repository: CorrectiveActionRepository;

  public constructor(repository: CorrectiveActionRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Ação não encontrada (404).
   * @throws {ValidationError} `status` inválido (400) — `atrasada` é derivado, nunca setado manualmente.
   */
  public async execute({ id, body }: UpdateCorrectiveActionInput): Promise<any> {
    const existente = await this.repository.findById(id);
    if (!existente) throw new NotFoundError('Ação corretiva não encontrada.');
    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      throw new ValidationError(`status inválido. Valores aceitos: ${STATUSES.join(', ')} (atrasada é derivado, não pode ser definido manualmente).`);
    }

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'concluida') data.concluida_em = new Date();
    }
    if (body.evidencia_conclusao_url !== undefined) data.evidencia_conclusao_url = body.evidencia_conclusao_url;
    if (body.descricao !== undefined) data.descricao = body.descricao;
    if (body.prazo !== undefined) data.prazo = body.prazo;
    if (body.responsavel_id !== undefined) data.responsavel_id = body.responsavel_id;

    const atualizada = await this.repository.update(id, data);
    return toCorrectiveActionDTO(atualizada);
  }
}

export = UpdateCorrectiveActionUseCase;
