/**
 * Use case: atualizar uma não conformidade existente.
 *
 * @module modules/nonConformities/application/use-cases/UpdateNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';

const ALLOWED_FIELDS = [
  'description',
  'severity',
  'origin',
  'quantity_affected',
  'immediate_action',
  'root_cause',
  'corrective_action',
  'status',
  'responsible_id',
  'closed_by'
];

interface UpdateNonConformityInput {
  id: number | string;
  body: Record<string, unknown>;
  closedBy: number;
}

class UpdateNonConformityUseCase extends UseCase<UpdateNonConformityInput, any> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Id da não conformidade, campos a atualizar e id do usuário autenticado.
   * @returns Não conformidade atualizada.
   * @throws {NotFoundError} Se o registro não existir.
   */
  public async execute({ id, body, closedBy }: UpdateNonConformityInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.status === 'closed') {
      updateData.closed_by = closedBy;
      updateData.closed_at = new Date();
    }

    const updated = await this.nonConformitiesRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError('Não conformidade não encontrada');
    }
    return this.nonConformitiesRepository.findById(id);
  }
}

export = UpdateNonConformityUseCase;
