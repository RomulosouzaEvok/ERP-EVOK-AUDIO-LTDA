import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const {
  resolvePurchaseOrigin,
  requiredApproverRoles,
  purchaseApprovalValue,
} = require('../../domain/constants');

/**
 * `POST /api/purchases/:id/approve` — registra 1 aprovacao de alcada de
 * pedido de compra (G11, decisao D-C do dono do produto em 2026-08-10).
 *
 * Mesmo padrao ja aprovado no Juridico (RF-JUR-003,
 * `ApproveContractUseCase`): a AUTORIZACAO real vem do RBAC — a rota e
 * protegida por `authorizeModule('diretor')` e o controller resolve
 * `availableRoles` a partir de `req.user.permissions`, NUNCA do body.
 * `approverUserId` vem sempre do JWT.
 *
 * Isto NAO e a aprovacao do pedido: aprovar o pedido continua sendo
 * `PUT /api/purchases/:id/status` com `status='approved'`
 * (`ChangePurchaseStatusUseCase`), que passa a exigir que as aprovacoes de
 * alcada exigidas ja estejam registradas.
 */
interface ApprovePurchaseInput {
  purchaseId: number | string;
  approverUserId: number;
  /** Papeis que o usuario logado efetivamente possui (resolvidos por RBAC no controller, nunca do body). */
  availableRoles: string[];
  transaction?: Transaction;
}

class ApprovePurchaseUseCase extends UseCase {
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
   * @param {number} input.approverUserId - Sempre `req.user.id` (JWT).
   * @param {string[]} input.availableRoles - Papeis de alcada do usuario logado, resolvidos por RBAC.
   * @param {import('sequelize').Transaction} [input.transaction]
   * @returns {Promise<Object>} Aprovacao criada.
   * @throws {NotFoundError} Pedido inexistente.
   * @throws {BusinessRuleError} Usuario sem papel de aprovador; pedido em status que nao admite mais aprovacao de alcada; pedido que nao exige alcada; ou papel que ja aprovou este pedido.
   */
  async execute({ purchaseId, approverUserId, availableRoles, transaction }: ApprovePurchaseInput) {
    const purchase = await this.purchaseRepository.findPurchaseByIdRaw(purchaseId, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido nao encontrado');
    }

    // A alcada so faz sentido ANTES da aprovacao do pedido — depois disso o
    // compromisso ja foi assumido e a conta a pagar ja nasceu.
    if (purchase.status !== 'pending') {
      throw new BusinessRuleError(
        `Pedido esta com status "${purchase.status}": a aprovacao de alcada so pode ser registrada enquanto o pedido esta pendente.`,
        { rule: 'G11' },
      );
    }

    const roles = availableRoles || [];
    if (roles.length === 0) {
      throw new BusinessRuleError('Usuario nao possui papel de aprovador de alcada (diretor).', { rule: 'G11' });
    }

    const supplier = purchase.supplier_id
      ? await this.purchaseRepository.findSupplierByIdRaw(purchase.supplier_id, transaction)
      : null;
    const origin = resolvePurchaseOrigin(purchase.origin, supplier ? supplier.is_foreign : false);
    const approvalValue = purchaseApprovalValue(purchase);
    const required = requiredApproverRoles(origin, approvalValue);

    if (required.length === 0) {
      throw new BusinessRuleError(
        `Este pedido (origem ${origin}, valor R$ ${approvalValue.toFixed(2)}) nao exige aprovacao de alcada.`,
        { rule: 'G11', origin, approvalValue },
      );
    }

    const role = required.find((requiredRole: string) => roles.includes(requiredRole));
    if (!role) {
      throw new BusinessRuleError(
        `Usuario nao possui nenhum dos papeis exigidos por este pedido: ${required.join(', ')}.`,
        { rule: 'G11', origin, requiredRoles: required },
      );
    }

    const existing = await this.purchaseRepository.findPurchaseApprovalByRole(purchase.id, role, transaction);
    if (existing) {
      throw new BusinessRuleError(`O papel "${role}" ja aprovou este pedido.`, { rule: 'G11' });
    }

    return this.purchaseRepository.createPurchaseApproval({
      purchase_id: purchase.id,
      approver_user_id: approverUserId,
      approver_role: role,
      approved_at: new Date(),
    }, transaction);
  }
}

module.exports = ApprovePurchaseUseCase;
