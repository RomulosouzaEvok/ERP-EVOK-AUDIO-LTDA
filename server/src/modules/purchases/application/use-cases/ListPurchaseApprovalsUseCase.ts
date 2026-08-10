import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
const {
  resolvePurchaseOrigin,
  requiredApproverRoles,
  purchaseApprovalValue,
} = require('../../domain/constants');

/**
 * `GET /api/purchases/:id/approvals` — situacao da alcada de aprovacao de um
 * pedido de compra (G11).
 *
 * Existe pelo mesmo motivo do equivalente no Juridico
 * (`ListContractApprovalsUseCase`, RF-JUR-003): a tela precisa saber se o
 * pedido exige a diretoria e o que ainda falta **sem efeito colateral** —
 * sem este endpoint, o unico jeito de descobrir seria tentar
 * `POST /approve` (que grava uma aprovacao de verdade) ou tentar aprovar o
 * pedido e tomar 422.
 *
 * Devolve tambem `origin`/`origin_source`, para a tela conseguir explicar ao
 * comprador POR QUE o pedido caiu na alcada (fornecedor estrangeiro no
 * cadastro x declaracao no pedido x valor).
 */
interface ListPurchaseApprovalsInput {
  purchaseId: number | string;
}

class ListPurchaseApprovalsUseCase extends UseCase {
  private purchaseRepository: PurchaseRepository;

  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository: PurchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.purchaseId
   * @returns {Promise<{ origin: string, origin_source: string, approval_value: number, required_roles: string[], approvals: Object[], missing_roles: string[], approval_complete: boolean }>}
   * @throws {NotFoundError} Pedido inexistente.
   */
  async execute({ purchaseId }: ListPurchaseApprovalsInput) {
    const purchase = await this.purchaseRepository.findPurchaseByIdRaw(purchaseId);
    if (!purchase) {
      throw new NotFoundError('Pedido nao encontrado');
    }

    const supplier = purchase.supplier_id
      ? await this.purchaseRepository.findSupplierByIdRaw(purchase.supplier_id)
      : null;
    const supplierIsForeign = supplier ? supplier.is_foreign === true : false;
    const origin = resolvePurchaseOrigin(purchase.origin, supplierIsForeign);
    const approvalValue = purchaseApprovalValue(purchase);
    const requiredRoles = requiredApproverRoles(origin, approvalValue);

    const approvals = (await this.purchaseRepository.listPurchaseApprovals(purchase.id)) || [];
    const approvedRoles = new Set(approvals.map((approval: any) => approval.approver_role));
    const missingRoles = requiredRoles.filter((role: string) => !approvedRoles.has(role));

    return {
      origin,
      // Por que o pedido e importacao: `supplier` (cadastro, nao burlavel no
      // pedido), `declared` (declaracao de quem montou o pedido) ou `none`.
      origin_source: supplierIsForeign ? 'supplier' : (purchase.origin === 'import' ? 'declared' : 'none'),
      approval_value: approvalValue,
      required_roles: requiredRoles,
      approvals,
      missing_roles: missingRoles,
      approval_complete: missingRoles.length === 0,
    };
  }
}

module.exports = ListPurchaseApprovalsUseCase;
