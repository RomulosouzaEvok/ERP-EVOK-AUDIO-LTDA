import type { Transaction } from 'sequelize';
import type { IReconciliationRepository } from '../../domain/repositories/ReconciliationRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/** Dados de entrada de `UnmatchEntryUseCase.execute`. */
interface UnmatchEntryInput {
  entryId: number | string;
  transaction: Transaction;
}

/**
 * Desfaz o vínculo (`matched -> pending`) de um lançamento já conciliado.
 *
 * DECISÃO CONSERVADORA (documentada a pedido do escopo da feature): o
 * desfazer NUNCA reverte a baixa (pagamento/recebimento) já registrada na
 * conta a pagar/receber. Como `MatchEntryUseCase` sempre quita a conta
 * integralmente (dentro da tolerância de centavos), a conta vinculada
 * estará com `status = 'paid'` logo após o match — nesse caso, `unmatch`
 * responde 422 explicando que a baixa deve ser corrigida manualmente pelo
 * financeiro (não há endpoint de "despagar" neste módulo). O desvínculo
 * only é permitido se, por algum motivo externo ao fluxo desta feature, a
 * conta associada não estiver mais `paid` no momento do unmatch.
 */
class UnmatchEntryUseCase extends UseCase {
  reconciliationRepository: IReconciliationRepository;

  constructor(reconciliationRepository: IReconciliationRepository) {
    super();
    this.reconciliationRepository = reconciliationRepository;
  }

  /**
   * @param {UnmatchEntryInput} input
   * @returns {Promise<Object>}
   */
  async execute({ entryId, transaction }: UnmatchEntryInput) {
    const entry = await this.reconciliationRepository.findEntryByIdForUpdate(entryId, transaction);
    if (!entry) throw new NotFoundError('Lançamento do extrato não encontrado.');

    if (entry.status !== 'matched') {
      throw new BusinessRuleError('Este lançamento não está conciliado — não há vínculo para desfazer.');
    }

    if (entry.matched_payable_id) {
      const payable = await this.reconciliationRepository.findPayableByIdForUpdate(entry.matched_payable_id, transaction);
      if (payable?.status === 'paid') {
        throw new BusinessRuleError(
          'Esta conta a pagar já foi baixada (paga) a partir desta conciliação. Desfazer o vínculo NÃO reverte o pagamento — '
          + 'se a baixa estiver incorreta, corrija manualmente a conta a pagar no módulo Financeiro.',
        );
      }
    } else if (entry.matched_receivable_id) {
      const receivable = await this.reconciliationRepository.findReceivableByIdForUpdate(entry.matched_receivable_id, transaction);
      if (receivable?.status === 'paid') {
        throw new BusinessRuleError(
          'Esta conta a receber já foi baixada (recebida) a partir desta conciliação. Desfazer o vínculo NÃO reverte o recebimento — '
          + 'se a baixa estiver incorreta, corrija manualmente a conta a receber no módulo Financeiro.',
        );
      }
    }

    return this.reconciliationRepository.updateEntry(entryId, {
      status: 'pending',
      matched_payable_id: null,
      matched_receivable_id: null,
      matched_by: null,
      matched_at: null,
    }, transaction);
  }
}

module.exports = UnmatchEntryUseCase;
