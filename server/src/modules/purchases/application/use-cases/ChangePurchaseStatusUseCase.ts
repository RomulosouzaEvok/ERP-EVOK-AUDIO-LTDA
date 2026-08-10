import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const {
  resolvePurchaseOrigin,
  requiredApproverRoles,
  purchaseApprovalValue,
} = require('../../domain/constants');

/**
 * Maquina de estados de status do pedido de compra.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'canceled'],
  approved: ['sent', 'canceled'],
  sent: ['partial', 'received', 'canceled'],
  partial: ['received', 'canceled'],
  received: [],
  canceled: []
};

interface ChangePurchaseStatusInput {
  id: number | string;
  status: string;
  userId: number;
  transaction: Transaction;
}

/**
 * Transiciona o status de um pedido de compra respeitando
 * `VALID_TRANSITIONS` e a alçada de aprovação por origem (G11).
 *
 * GAP G13 (2026-08-10, decisão D-A do dono em
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4) — **a
 * aprovação do pedido NÃO cria mais conta a pagar.** Até esta data a
 * transição `pending -> approved` chamava `_createPurchasePayable` e
 * lançava uma `AccountPayable` do valor do pedido inteiro, com vencimento
 * `expected_date + 30`.
 *
 * Base normativa (CPC 00 (R2), Estrutura Conceitual):
 *  - **4.56** — pedido aprovado e não entregue é *contrato executório*;
 *  - **4.58** — o passivo surge quando **a outra parte cumpre primeiro**,
 *    isto é, quando o fornecedor entrega.
 *
 * O passivo passou para `ReceivePurchaseItemsUseCase`, no valor do que foi
 * de fato recebido e amarrado à NF do fornecedor. Ver
 * `../../domain/services/purchasePayableRules`.
 *
 * O que isso corrige, concretamente: passivo inexistente no balanço,
 * projeção de fluxo de caixa contaminada por pedidos que podem nunca
 * chegar (inclusive pedidos depois **cancelados**, que deixavam a AP para
 * trás) e vencimento fictício calculado sobre uma data prometida.
 */
class ChangePurchaseStatusUseCase extends UseCase {
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
   * @param {number} input.id
   * @param {string} input.status
   * @param {number} input.userId - Usuário do JWT (anti-spoofing). Mantido no contrato para auditoria; desde o G13 não é mais usado como `approved_by` de nenhuma conta a pagar.
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   * @throws {BusinessRuleError} G11 — transição para `approved` sem a alçada satisfeita (importação, ou nacional acima de R$ 500.000, sem aprovação registrada da diretoria).
   */
  async execute({ id, status, transaction }: ChangePurchaseStatusInput) {
    if (!status) {
      throw new ValidationError('Status e obrigatorio');
    }

    const purchase = await this.purchaseRepository.findPurchaseByIdRawForUpdate(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido nao encontrado');
    }
    if (purchase.status === status) {
      throw new ValidationError(`Pedido ja esta com status ${status}`);
    }

    const allowed = VALID_TRANSITIONS[purchase.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transicao de status invalida: ${purchase.status} -> ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    // G11: a alcada e verificada ANTES de gravar o novo status — pedido sem
    // aprovacao da diretoria nao pode sequer ficar `approved`. Depois do G13
    // a aprovacao nao gera mais passivo nenhum, mas a alcada continua sendo
    // o portao: um pedido que nao pode ser aprovado nunca chega a `sent` e,
    // portanto, nunca chega ao recebimento que hoje cria a conta a pagar
    // (`sent`/`partial` sao os unicos status que `ReceivePurchaseItemsUseCase`
    // aceita, e a maquina de estados so alcanca `sent` a partir de
    // `approved`). A cadeia aprovacao -> passivo continua intacta, so ficou
    // mais longa e mais correta.
    if (status === 'approved') {
      await this._assertApprovalAuthority(purchase, transaction);
    }

    const previousStatus = purchase.status;
    purchase.status = status;
    await purchase.save({ transaction });

    return { purchase, previousStatus };
  }

  /**
   * G11 — alcada de aprovacao de pedido de compra por ORIGEM (decisao D-C do
   * dono do produto em 2026-08-10).
   *
   * Nacional dentro do teto continua fluindo sem nenhuma friccao nova (a
   * maioria dos pedidos): a funcao apenas resolve a origem e retorna. Acima
   * do teto, ou em qualquer valor quando a origem e importacao, exige
   * aprovacao previa registrada em `purchase_order_approvals`
   * (`POST /api/purchases/:id/approve`).
   *
   * A origem NAO e lida apenas de `purchase_orders.origin` (campo que quem
   * monta o pedido controla): `suppliers.is_foreign` prevalece, de modo que
   * marcar um pedido de fornecedor estrangeiro como `national` nao escapa da
   * diretoria — ver `../../domain/constants`.
   *
   * @param {Object} purchase - Pedido ja carregado com lock na transacao.
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<void>}
   * @throws {BusinessRuleError} Se faltar alguma aprovacao exigida.
   */
  async _assertApprovalAuthority(purchase: any, transaction: Transaction) {
    const supplier = purchase.supplier_id
      ? await this.purchaseRepository.findSupplierByIdRaw(purchase.supplier_id, transaction)
      : null;

    const origin = resolvePurchaseOrigin(purchase.origin, supplier ? supplier.is_foreign : false);
    const approvalValue = purchaseApprovalValue(purchase);
    const required = requiredApproverRoles(origin, approvalValue);
    if (required.length === 0) return;

    const approvals = (await this.purchaseRepository.listPurchaseApprovals(purchase.id, transaction)) || [];
    const approvedRoles = new Set(approvals.map((approval: any) => approval.approver_role));
    const missing = required.filter((role: string) => !approvedRoles.has(role));

    if (missing.length > 0) {
      const reason = origin === 'import'
        ? 'pedido de importacao (exige a diretoria em qualquer valor)'
        : `valor de R$ ${approvalValue.toFixed(2)} acima do teto da alcada`;
      throw new BusinessRuleError(
        `Aprovacao da diretoria pendente: ${reason}. Registre a aprovacao em POST /api/purchases/${purchase.id}/approve antes de aprovar o pedido.`,
        { rule: 'G11', origin, approvalValue, missingRoles: missing },
      );
    }
  }

}

module.exports = ChangePurchaseStatusUseCase;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
