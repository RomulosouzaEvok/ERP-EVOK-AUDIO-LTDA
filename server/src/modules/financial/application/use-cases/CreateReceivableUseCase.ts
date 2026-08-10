import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { ValidationError, BusinessRuleError } = require('../../../../errors');

/** Dados de entrada de `CreateReceivableUseCase.execute`. */
interface CreateReceivableInput {
  customer_id: number;
  amount: number | string;
  due_date: string | Date;
  installment?: number;
  invoice_number?: string;
  notes?: string;
  cost_center_id?: number;
  /** Só aparece aqui para ser RECUSADO — ver a regra G13-AR no JSDoc. */
  sale_id?: number;
  /** Só aparece aqui para ser RECUSADO — parcela nunca nasce baixada. */
  status?: string;
}

/**
 * Cria uma conta a receber **avulsa** (sem venda vinculada), cobrindo o
 * endpoint `POST /api/finance/receivable`.
 *
 * ## Por que este caminho existe (decisão D-J do dono, 2026-08-10)
 *
 * Nem toda cobrança nasce de uma venda de produto: **reembolso, aluguel e
 * venda de sucata** são casos reais da operação. O dono registrou
 * explicitamente que esse caminho é legítimo e **permanece aberto** — não é
 * achado de auditoria (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
 * §4, D-J). `accounts_receivable.sale_id` é nullable justamente para isso.
 *
 * ## A fronteira que este use case defende (gap G13)
 *
 * Recebível **originado de venda** passou a exigir a NF-e: pelo CPC 47 item
 * 108, recebível é o direito **incondicional** à contraprestação, e antes
 * da nota autorizada o direito é condicional ao faturamento (item 38 —
 * nenhum indicador de transferência de controle está presente na
 * confirmação do pedido). Esse recebível é criado **exclusivamente** pela
 * autorização da NF-e (`services/saleReceivableService.ts`).
 *
 * Portanto, informar `sale_id` aqui é recusado com `details.rule =
 * 'G13-AR'`: seria a porta dos fundos para recriar exatamente o problema
 * que o G13 fechou — recebível de venda sem nota. Recebível **sem**
 * `sale_id` passa normalmente.
 *
 * ## Nenhuma parcela nasce paga
 *
 * `status` não é aceito no payload: toda parcela nasce `pending`. Quitação
 * é evento próprio (`PUT /api/finance/receivable/:id/pay`), com valor,
 * data, usuário e conciliação bancária possível. Uma parcela que nasce
 * `paid` afirma um recebimento que ninguém pode provar e nunca aparece como
 * pendência no extrato — o buraco silencioso descrito em
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`,
 * Decisão 6 (C-bis).
 */
class CreateReceivableUseCase extends UseCase {
  financialRepository: IFinancialRepository;

  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   */
  constructor(financialRepository: IFinancialRepository) {
    super();
    this.financialRepository = financialRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.customer_id - Cliente devedor (FK `clients.id`; obrigatório mesmo sem venda).
   * @param {number|string} input.amount - Valor da parcela, maior que zero.
   * @param {string|Date} input.due_date - Vencimento.
   * @param {number} [input.installment=1] - Nº da parcela (padrão 1).
   * @param {string} [input.invoice_number] - Documento de referência (recibo, contrato de aluguel...), opcional.
   * @param {string} [input.notes] - Observação livre (a origem da cobrança: reembolso, aluguel, sucata...).
   * @param {number} [input.cost_center_id] - Centro de custo (opcional).
   * @param {number} [input.sale_id] - **Recusado**: recebível de venda nasce na NF-e.
   * @param {string} [input.status] - **Recusado**: parcela sempre nasce `pending`.
   * @returns {Promise<Object>} Conta a receber criada, sempre `pending`.
   * @throws {ValidationError} Se `customer_id`, `amount` ou `due_date` forem inválidos.
   * @throws {BusinessRuleError} `details.rule = 'G13-AR'` se `sale_id` for informado (recebível de venda só nasce na autorização da NF-e); `details.rule = 'G13-AR-PAID'` se `status` for informado (nenhuma parcela nasce baixada).
   */
  async execute({ customer_id, amount, due_date, installment, invoice_number, notes, cost_center_id, sale_id, status }: CreateReceivableInput) {
    if (sale_id !== undefined && sale_id !== null) {
      throw new BusinessRuleError(
        'Conta a receber de venda nasce na autorizacao da NF-e (POST /api/sales/:id/nfe), nao neste endpoint. Cobranca avulsa (reembolso, aluguel, venda de sucata) deve ser criada SEM sale_id.',
        { rule: 'G13-AR', sale_id, field: 'sale_id' }
      );
    }

    if (status !== undefined && status !== null) {
      throw new BusinessRuleError(
        'Conta a receber sempre nasce pendente. Registre o recebimento em PUT /api/finance/receivable/:id/pay para que exista data, valor, usuario e contrapartida conciliavel no extrato.',
        { rule: 'G13-AR-PAID', status, field: 'status' }
      );
    }

    const parsedCustomerId = Number(customer_id);
    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      throw new ValidationError('Cliente (customer_id) e obrigatorio.', { field: 'customer_id' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError('Valor deve ser maior que zero.', { field: 'amount' });
    }

    if (!due_date) {
      throw new ValidationError('Vencimento (due_date) e obrigatorio.', { field: 'due_date' });
    }

    const parsedInstallment = installment === undefined ? 1 : Number(installment);
    if (!Number.isInteger(parsedInstallment) || parsedInstallment <= 0) {
      throw new ValidationError('Numero da parcela (installment) deve ser inteiro positivo.', { field: 'installment' });
    }

    return this.financialRepository.createReceivable({
      // Explicitamente NULL: é o que distingue cobrança avulsa de recebível
      // de venda, e o que a decisão D-J mantém aberto.
      sale_id: null,
      customer_id: parsedCustomerId,
      installment: parsedInstallment,
      amount: Math.round(parsedAmount * 100) / 100,
      due_date,
      status: 'pending',
      payment_date: null,
      invoice_number: invoice_number ?? null,
      notes: notes ?? null,
      cost_center_id: cost_center_id ?? null,
    });
  }
}

module.exports = CreateReceivableUseCase;
