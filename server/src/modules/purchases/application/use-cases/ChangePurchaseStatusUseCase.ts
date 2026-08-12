import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const {
  resolvePurchaseOrigin,
  requiredApproverRoles,
  purchaseApprovalValue,
  checkPurchaseOriginAgainstSupplier,
  PURCHASE_ORIGIN_MISMATCH_RULE,
} = require('../../domain/constants');
const {
  assertApproverIsNotRequester,
  SEGREGATION_RULES,
} = require('../../../../shared/domain/segregationOfDuties');

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
 *
 * ## Segregação de função (D-K, 2026-08-10)
 *
 * A transição `pending -> approved` passou a ter **dois** portões
 * independentes, verificados nesta ordem e ambos ANTES do `save()`:
 *
 * 1. **D-K — quem aprova não é quem solicitou** (`purchase_orders.requester_id`
 *    × `req.user.id`). Vale para todo pedido, em qualquer valor e origem,
 *    inclusive `role = 'admin'`. Ver `shared/domain/segregationOfDuties`.
 * 2. **G11 — alçada por origem** (a diretoria já registrou a aprovação
 *    exigida?), ver {@link ChangePurchaseStatusUseCase._assertApprovalAuthority}.
 *
 * A ordem importa para a qualidade da mensagem: não adianta mandar o
 * comprador buscar um diretor (G11) se, mesmo com a alçada satisfeita, ele
 * continuaria barrado por ser o solicitante.
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
   * @param {number} input.userId - Usuário do JWT (anti-spoofing). Desde o G13 não é mais usado como `approved_by` de nenhuma conta a pagar; desde o D-K é a identidade comparada com `purchase_orders.requester_id` na segregação de função.
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   * @throws {BusinessRuleError} D-K (`details.rule = 'D-K-PEDIDO'`) — quem aprova é quem solicitou o pedido.
   * @throws {BusinessRuleError} G11 (`details.rule = 'G11'`) — transição para `approved` sem a alçada satisfeita (importação, ou nacional acima de R$ 500.000, sem aprovação registrada da diretoria).
   */
  async execute({ id, status, userId, transaction }: ChangePurchaseStatusInput) {
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
      // D-K: segregacao de funcao antes da alcada — ver cabecalho da classe.
      // `requester_id` passou a ser NOT NULL na migration `20260810-000040`,
      // fechando a unica frouxidao real da regra (linha sem solicitante era
      // aprovavel por qualquer pessoa). A guarda de `isSelfApproval` para
      // solicitante ausente continua no lugar de proposito: ela protege o
      // caminho contra dado carregado por fora do ERP.
      assertApproverIsNotRequester({
        rule: SEGREGATION_RULES.PURCHASE_ORDER,
        requesterUserId: purchase.requester_id,
        approverUserId: userId,
        documentLabel: `o pedido de compra ${purchase.order_number ?? id}`,
        approverHint: "outro usuario com acesso ao modulo de compras (ou outro administrador)",
      });

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

    // G11 (auditoria 2026-08-11) — segunda linha de defesa da coerencia
    // origem x cadastro. A criacao ja recusa a combinacao incoerente, mas
    // pedidos gravados ANTES desta regra (ou por qualquer caminho que nao
    // passe por `CreatePurchaseUseCase`) ainda podem chegar aqui declarados
    // como importacao com fornecedor nacional. Aprovar assim consolidaria o
    // dado errado no documento que vira compromisso financeiro; recusar e
    // acionavel (marcar o fornecedor como estrangeiro, ou corrigir a origem).
    const originCheck = checkPurchaseOriginAgainstSupplier(purchase.origin, supplier ? supplier.is_foreign : false);
    if (!originCheck.coherent) {
      throw new BusinessRuleError(
        `O pedido ${purchase.order_number ?? purchase.id} esta declarado como IMPORTACAO, mas o fornecedor `
        + `"${supplier?.company_name ?? purchase.supplier_id}" esta cadastrado como NACIONAL. Corrija o cadastro do `
        + 'fornecedor (Compras > Fornecedores) ou a origem do pedido antes de aprovar — a origem comanda a alcada.',
        {
          rule: PURCHASE_ORIGIN_MISMATCH_RULE,
          supplier_id: supplier?.id ?? purchase.supplier_id ?? null,
          supplier_is_foreign: supplier?.is_foreign === true,
          declared_origin: purchase.origin ?? null,
        },
      );
    }

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
