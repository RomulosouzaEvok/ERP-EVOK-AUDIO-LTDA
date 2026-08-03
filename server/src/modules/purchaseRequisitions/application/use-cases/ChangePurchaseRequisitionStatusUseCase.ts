/**
 * Caso de uso para transicionar o status de uma requisicao de compra.
 *
 * Transicoes validas:
 * - draft -> pending | canceled
 * - pending -> approved | canceled
 *
 * Ao aprovar (status = approved), registra `approved_by` (usuario logado) e
 * `approval_date` (data atual).
 *
 * @module modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

type RequisitionStatus = 'draft' | 'pending' | 'approved' | 'canceled';

interface ChangePurchaseRequisitionStatusInput {
  id: number;
  status: RequisitionStatus;
  userId: number;
}

/** Mapa de transicoes validas: status atual -> status permitidos. */
const VALID_TRANSITIONS: Record<string, RequisitionStatus[]> = {
  draft: ['pending', 'canceled'],
  pending: ['approved', 'canceled'],
};

class ChangePurchaseRequisitionStatusUseCase extends UseCase<ChangePurchaseRequisitionStatusInput, any> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;

  public constructor(requisitionRepository: PurchaseRequisitionRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
  }

  /**
   * Executa a transicao de status da requisicao.
   *
   * @param input - id da requisicao, status desejado e id do usuario logado.
   * @returns Requisicao atualizada.
   * @throws NotFoundError se a requisicao nao existir.
   * @throws BusinessRuleError se a transicao nao for permitida.
   */
  public async execute(input: ChangePurchaseRequisitionStatusInput): Promise<any> {
    const requisition = await this.requisitionRepository.findRequisitionById(input.id);
    if (!requisition) {
      throw new NotFoundError('Requisicao nao encontrada.');
    }

    const currentStatus = requisition.status;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowedNextStatuses.includes(input.status)) {
      throw new BusinessRuleError(
        `Transicao de status invalida: ${currentStatus} -> ${input.status}.`,
        { current_status: currentStatus, requested_status: input.status }
      );
    }

    const updateData: Record<string, unknown> = { status: input.status };

    if (input.status === 'approved') {
      updateData.approved_by = input.userId;
      updateData.approval_date = new Date().toISOString().slice(0, 10);
    }

    return this.requisitionRepository.updateRequisition(input.id, updateData);
  }
}

export = ChangePurchaseRequisitionStatusUseCase;
