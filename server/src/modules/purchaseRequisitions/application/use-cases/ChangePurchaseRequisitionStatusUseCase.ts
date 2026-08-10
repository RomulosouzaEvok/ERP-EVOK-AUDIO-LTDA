/**
 * Caso de uso para transicionar MANUALMENTE o status de uma requisicao de
 * compra.
 *
 * Transicoes validas (manuais):
 * - draft -> pending | canceled
 * - pending -> approved | canceled
 *
 * Ao aprovar (status = approved), registra `approved_by` (usuario logado) e
 * `approval_date` (data atual).
 *
 * ## Segregacao de funcao (D-K, 2026-08-10)
 *
 * Aprovar exige, alem do nivel `requisicoes:approve` da rota, que o
 * aprovador NAO seja o solicitante (`purchase_requisitions.requester_id`).
 * A checagem roda ANTES do unico `UPDATE` deste caso de uso, entao uma
 * auto-aprovacao reprovada nao deixa nada gravado — nem `status`, nem
 * `approved_by`, nem `approval_date`. Ver
 * `shared/domain/segregationOfDuties`.
 *
 * ⚠️ `role = 'admin'` NAO isenta (ver justificativa no cabecalho daquele
 * modulo): 7 das 7 requisicoes aprovadas no banco de dev foram
 * auto-aprovadas pelo admin, que e exatamente o furo que a regra fecha.
 *
 * ## Os demais estados do ENUM sao AUTOMATICOS, nao manuais (gap G15)
 *
 * `purchase_requisitions.status` tem tambem `ordered`, `partial` e
 * `received`. Nenhum deles e alcancavel por este caso de uso, **de
 * proposito** — sao fatos derivados de outros modulos, e permitir marca-los
 * a mao seria criar um jeito de declarar "requisicao atendida" sem nada ter
 * chegado ao estoque:
 *
 * | Status     | Quem grava                                                                    | Significado                                   |
 * |------------|-------------------------------------------------------------------------------|-----------------------------------------------|
 * | `ordered`  | `ConvertRequisitionToPurchaseOrdersUseCase` / `AwardRfqUseCase` (gap G12)      | todo o saldo requisitado virou pedido          |
 * | `partial`  | `ReceivePurchaseItemsUseCase` (gap G15)                                       | parte do que foi requisitado ja chegou fisicamente |
 * | `received` | `ReceivePurchaseItemsUseCase` (gap G15)                                       | requisicao atendida — tudo chegou              |
 *
 * Ate 2026-08-09 `partial` e `received` eram estados MORTOS: existiam no
 * ENUM e nenhuma rotina os atingia, entao ninguem conseguia responder "esta
 * requisicao foi atendida?". A regra que os aciona (e a razao de uma
 * requisicao `approved` com saldo NAO ser tocada pelo recebimento) esta em
 * `modules/purchases/application/services/syncRequisitionReceiptStatus.ts`.
 *
 * @module modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import { assertApproverIsNotRequester, SEGREGATION_RULES } from '../../../../shared/domain/segregationOfDuties';
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
   * @throws BusinessRuleError se a transicao nao for permitida, ou (D-K, `details.rule = 'D-K-REQUISICAO'`) se o aprovador for o proprio solicitante.
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
      // D-K — segregacao de funcao. Antes do UPDATE: reprovar aqui nao deixa
      // estado parcial gravado.
      assertApproverIsNotRequester({
        rule: SEGREGATION_RULES.PURCHASE_REQUISITION,
        requesterUserId: requisition.requester_id,
        approverUserId: input.userId,
        documentLabel: `a requisicao de compra ${requisition.requisition_number ?? input.id}`,
        approverHint: "outro usuario com nivel 'aprovar' no modulo de requisicoes (ou outro administrador)",
      });

      updateData.approved_by = input.userId;
      updateData.approval_date = new Date().toISOString().slice(0, 10);
    }

    return this.requisitionRepository.updateRequisition(input.id, updateData);
  }
}

export = ChangePurchaseRequisitionStatusUseCase;
