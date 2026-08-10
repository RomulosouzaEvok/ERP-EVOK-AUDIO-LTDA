import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Campos editáveis de um pedido de compra (mesmo conjunto do controller
 * anterior + `origin`, G11).
 */
const ALLOWED_FIELDS = ['expected_date', 'freight_type', 'freight_value', 'notes', 'supplier_id', 'origin'];

/**
 * G11 — campos que determinam a alçada de aprovação (origem declarada,
 * fornecedor e frete, que entra no valor comparado com o teto). Depois que o
 * pedido já foi aprovado, mudá-los seria aprovar um pedido e comprar outro:
 * daria para aprovar R$ 450.000 sem a diretoria e depois acrescentar
 * R$ 100.000 de frete, ou trocar o fornecedor por um estrangeiro.
 */
const APPROVAL_RELEVANT_FIELDS = ['supplier_id', 'freight_value', 'origin'];

/**
 * Atualiza campos permitidos de um pedido de compra, cobrindo o fluxo do
 * endpoint `PUT /api/purchases/:id`.
 *
 * Apenas pedidos `pending` ou `approved` podem ser editados — mesma regra
 * do controller anterior.
 */
class UpdatePurchaseUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  private purchaseRepository: PurchaseRepository;

  constructor(purchaseRepository: PurchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {Object} input.body - Corpo da requisição; apenas os campos em `ALLOWED_FIELDS` são considerados.
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ updated: Object, oldValues: Object, updateData: Object }>}
   * @throws {NotFoundError} Se o pedido não existir.
   * @throws {BusinessRuleError} Se o pedido não estiver em `pending`/`approved`; se tentar rebaixar `origin` de `import` para `national` (G11); ou se tentar mudar fornecedor/frete/origem de um pedido já aprovado (G11).
   */
  async execute({ id, body, transaction }: { id: number | string; body: Record<string, unknown>; transaction: Transaction }) {
    // Lock pessimista: serializa esta edicao contra uma mudanca de status
    // concorrente (ex.: aprovacao) do MESMO pedido — sem isso, esta edicao
    // podia ler status='pending' e aplicar as alteracoes mesmo apos o
    // pedido ja ter sido aprovado/enviado por outra requisicao.
    const purchase = await this.purchaseRepository.findPurchaseByIdRawForUpdate(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido não encontrado');
    }
    if (!['pending', 'approved'].includes(purchase.status)) {
      throw new BusinessRuleError('Apenas pedidos pendentes ou aprovados podem ser editados');
    }

    const updateData: any = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    // G11: origem e escalation-only — dá para corrigir um pedido que era
    // importação e foi cadastrado como nacional, nunca o contrário. Sem
    // isso, o campo que o comprador controla viraria a saída da alçada.
    if (updateData.origin === 'national' && purchase.origin === 'import') {
      throw new BusinessRuleError(
        'Pedido já declarado como importação não pode voltar a ser nacional — a alçada da diretoria é obrigatória em qualquer valor.',
        { rule: 'G11' },
      );
    }

    // G11: depois de aprovado, os campos que definem a alçada ficam
    // congelados (ver APPROVAL_RELEVANT_FIELDS).
    if (purchase.status === 'approved') {
      const frozen = APPROVAL_RELEVANT_FIELDS.filter((field) => updateData[field] !== undefined);
      if (frozen.length > 0) {
        throw new BusinessRuleError(
          `Pedido já aprovado: ${frozen.join(', ')} não pode(m) ser alterado(s) porque determina(m) a alçada de aprovação. Cancele o pedido e refaça.`,
          { rule: 'G11', frozenFields: frozen },
        );
      }
    }
    const oldValues: any = {};
    for (const field of Object.keys(updateData)) oldValues[field] = purchase[field];

    await this.purchaseRepository.updatePurchaseFields(id, updateData, transaction);
    const updated = await this.purchaseRepository.findPurchaseById(id);

    return { updated, oldValues, updateData };
  }
}

module.exports = UpdatePurchaseUseCase;



