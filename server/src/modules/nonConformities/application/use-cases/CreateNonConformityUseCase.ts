/**
 * Use case: registrar uma nova não conformidade.
 *
 * @module modules/nonConformities/application/use-cases/CreateNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';

interface CreateNonConformityInput {
  product_id?: number;
  production_order_id?: number;
  supplier_id?: number;
  description?: string;
  severity?: string;
  origin?: string;
  quantity_affected?: number;
  immediate_action?: string;
  reportedBy: number;
}

class CreateNonConformityUseCase extends UseCase<CreateNonConformityInput, any> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Dados da não conformidade (description obrigatória) e id do usuário autenticado.
   * @returns Não conformidade criada.
   * @throws {ValidationError} Se `description` estiver ausente.
   */
  public async execute(input: CreateNonConformityInput): Promise<any> {
    const {
      product_id,
      production_order_id,
      supplier_id,
      description,
      severity,
      origin,
      quantity_affected,
      immediate_action,
      reportedBy
    } = input;

    if (!description) {
      throw new ValidationError('Descrição é obrigatória');
    }

    return this.nonConformitiesRepository.create({
      product_id,
      production_order_id,
      supplier_id,
      description,
      severity: severity || 'medium',
      origin: origin || 'internal',
      quantity_affected,
      immediate_action,
      reported_by: reportedBy,
      status: 'open'
    });
  }
}

export = CreateNonConformityUseCase;
