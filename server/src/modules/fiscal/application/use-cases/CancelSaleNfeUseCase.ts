/**
 * Cancela a NF-e autorizada de uma venda (dentro do prazo legal de
 * cancelamento, tipicamente 24h — o provedor é quem valida esse prazo,
 * este use case não reimplementa a regra).
 *
 * ## D-M (2026-08-10) — cancelar a nota DEVOLVE o produto ao estoque
 *
 * Decisão do dono em
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4: até esta
 * data cancelar uma NF-e autorizada **não devolvia estoque** — comportamento
 * antigo, mantido de propósito no G9 para "baixado == faturado" seguir
 * valendo. *"Cancelou a nota, a mercadoria volta a existir."*
 *
 * Tudo acontece na MESMA transação, para que não exista estado intermediário
 * em que a nota está cancelada e o estoque ainda não voltou (ou o contrário):
 *
 * 1. **quantidade daquela emissão**, nunca a do pedido inteiro — a fonte é o
 *    snapshot `sale_invoices.items`, que já existe desde o histórico
 *    multi-NF-e e é o único lugar que sabe o que entrou nesta nota
 *    (faturamento parcial, G9);
 * 2. **ao mesmo lote de onde saiu** — via `sale_lot_shipments`
 *    (`services/saleLotService.ts`, D-L). Devolver a outro lote quebraria a
 *    rastreabilidade que o próprio gate de qualidade acabou de criar;
 * 3. **`SaleItem.invoiced_quantity` decrementa junto** — senão o pedido
 *    ficaria "faturado" com o estoque devolvido, que é exatamente a
 *    divergência que o G9 existe para impedir;
 * 4. **o status do pedido regride** de `invoiced`/`partially_invoiced` para
 *    `partially_invoiced`/`confirmed` conforme o saldo faturado restante, e a
 *    quantidade devolvida **volta a ficar reservada** para o próprio pedido —
 *    em `confirmed`, a regra do G9 é "confirmado = reservado". Sem isso a
 *    mercadoria voltaria solta e outro pedido poderia levá-la;
 * 5. **as parcelas daquela emissão são canceladas** — ver abaixo.
 *
 * ## Conta a receber da emissão cancelada
 *
 * O G13 (`2648686`) passou a criar a conta a receber na autorização da NF-e
 * (CPC 47 item 108: recebível exige direito **incondicional**). Cancelada a
 * nota, o direito deixa de existir — manter a parcela seria ativo sem
 * lastro, e o dono cobraria um cliente por uma nota que não existe mais.
 *
 * Cancela-se apenas o que é inequívoco: parcela **`pending` com
 * `amount_paid = 0`** da emissão cancelada (identificada por
 * `invoice_number`). Parcela que já recebeu dinheiro **não é tocada** — o
 * destino dela (devolução ao cliente, nota de crédito, abatimento na próxima
 * nota) é decisão do dono/contador, não do ERP. Nesses casos a parcela ganha
 * uma anotação explícita e o fato é logado, para a Tesouraria decidir com o
 * fato à vista em vez de descobrir por acaso.
 *
 * @module modules/fiscal/application/use-cases/CancelSaleNfeUseCase
 */

import type { Transaction } from 'sequelize';
import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const createNfeProvider = require('../../infrastructure/providers/NfeProviderFactory');
const SaleStockService = require('../../../../services/saleStockService');
const logger = require('../../../../config/logger');

/** Abaixo disso, diferença de quantidade é ruído de DECIMAL. */
const QUANTITY_EPSILON = 0.0000005;

interface CancelSaleNfeInput {
  saleId: number | string;
  reason: string;
  userId?: number;
}

class CancelSaleNfeUseCase extends UseCase {
  private fiscalRepository: FiscalRepository;

  /** @param {import('../../domain/repositories/FiscalRepository')} fiscalRepository */
  constructor(fiscalRepository: FiscalRepository) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.saleId
   * @param {string} input.reason - Justificativa do cancelamento (mínimo 15 caracteres, exigência da SEFAZ).
   * @param {number} [input.userId] - Usuário responsável (do JWT), autor do movimento de entrada da devolução (D-M). Ausente apenas sem requisição autenticada; cai no vendedor da venda (`Sale.user_id`, sempre NOT NULL).
   * @returns {Promise<Object>} A venda com a NF-e cancelada e o estoque devolvido.
   */
  async execute({ saleId, reason, userId }: CancelSaleNfeInput) {
    if (!reason || reason.trim().length < 15) {
      throw new BusinessRuleError('Justificativa de cancelamento deve ter ao menos 15 caracteres (exigência da SEFAZ).');
    }

    const sale = await this.fiscalRepository.findSaleById(saleId);
    if (!sale) throw new NotFoundError('Venda não encontrada');
    if (sale.nfe_status !== 'authorized') {
      throw new BusinessRuleError(`Apenas NF-e autorizada pode ser cancelada. Status atual: '${sale.nfe_status}'.`);
    }

    const config = await this.fiscalRepository.findCompanyFiscalConfig();
    if (!config) throw new BusinessRuleError('Configuração fiscal da empresa não cadastrada.');

    const provider = createNfeProvider(config.nfe_provider);
    const result = await provider.cancel(sale.nfe_provider_ref, reason.trim());

    return sequelize.transaction(async (transaction: Transaction) => {
      const locked = await this.fiscalRepository.findSaleById(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) throw new NotFoundError('Venda não encontrada');

      // Histórico multi-NF-e (2026-08-06): propaga o cancelamento também
      // para o registro da emissão em `sale_invoices` (dual-write, mesma
      // referência de `Sale.nfe_provider_ref`).
      const saleInvoice = locked.nfe_provider_ref
        ? await this.fiscalRepository.findSaleInvoiceByProviderRef(locked.nfe_provider_ref, { transaction, lock: transaction.LOCK.UPDATE })
        : null;

      if (result.status !== 'cancelled') {
        locked.nfe_error_message = result.error_message;
        throw new BusinessRuleError(result.error_message || 'Falha ao cancelar NF-e no provedor.');
      }

      // Idempotência: só devolve o que de fato saiu. Uma emissão que nunca
      // chegou a `authorized` não baixou estoque nenhum (a baixa do G9
      // acontece junto da autorização), e uma já `cancelled` já devolveu.
      const wasAuthorized = saleInvoice
        ? saleInvoice.nfe_status === 'authorized'
        : locked.nfe_status === 'authorized';

      if (wasAuthorized) {
        await this.restoreCanceledInvoice({
          sale: locked,
          saleInvoice,
          userId: userId ?? locked.user_id,
          reason: reason.trim(),
          transaction,
        });
      }

      locked.nfe_status = 'cancelled';
      locked.nfe_error_message = null;
      if (saleInvoice) {
        saleInvoice.nfe_status = 'cancelled';
        saleInvoice.nfe_error_message = null;
        await saleInvoice.save({ transaction });
      }

      await locked.save({ transaction });
      return locked;
    });
  }

  /**
   * D-M — desfaz os efeitos de estoque/faturamento/recebível de UMA emissão.
   *
   * @param params.sale - Venda já travada na transação.
   * @param params.saleInvoice - Emissão cancelada (traz o snapshot de itens desta nota).
   * @param params.userId - Responsável pela devolução (do JWT).
   * @param params.reason - Justificativa do cancelamento, propagada às anotações.
   * @param params.transaction - Transação ativa (a mesma do cancelamento).
   * @returns void
   */
  private async restoreCanceledInvoice(params: {
    sale: any;
    saleInvoice: any | null;
    userId: number;
    reason: string;
    transaction: Transaction;
  }): Promise<void> {
    const { sale, saleInvoice, userId, transaction } = params;

    // Sem snapshot da emissão não há como saber o que ESTA nota levou —
    // devolver o pedido inteiro seria pior que não devolver (criaria estoque
    // do nada em venda parcialmente faturada). Venda anterior ao histórico
    // multi-NF-e cai aqui; fica registrado como risco residual em
    // `docs/governance/TODO.md`.
    const snapshot: any[] = Array.isArray(saleInvoice?.items) ? saleInvoice.items : [];
    if (snapshot.length === 0) {
      logger.warn('[D-M] NF-e cancelada sem snapshot de itens: estoque NAO devolvido', {
        sale_id: sale.id,
        nfe_provider_ref: sale.nfe_provider_ref,
      });
      return;
    }

    // (1) `invoiced_quantity` volta atrás — na mesma transação da devolução
    // de estoque, senão o pedido fica "faturado" sem mercadoria baixada.
    const items = await this.fiscalRepository.findSaleItemsBySaleId(sale.id, { transaction, lock: transaction.LOCK.UPDATE });
    const itemById = new Map<number, any>(items.map((item: any) => [Number(item.id), item]));

    for (const entry of snapshot) {
      const item = itemById.get(Number(entry.sale_item_id));
      if (!item) continue;
      const next = Number(item.invoiced_quantity || 0) - Number(entry.quantity || 0);
      item.invoiced_quantity = next > QUANTITY_EPSILON ? next : 0;
      await item.save({ transaction });
    }

    const anyStillInvoiced = items.some((item: any) => Number(item.invoiced_quantity || 0) > QUANTITY_EPSILON);

    // (2) Status do pedido: só regride de um estado de faturamento. `shipped`
    // é terminal na máquina de estados da venda (`ChangeSaleStatusUseCase`) e
    // não é revertido aqui — a mercadoria já saiu fisicamente; o estoque
    // volta (decisão do dono é incondicional), mas sem reserva, porque não há
    // pedido aberto para reservá-la.
    const willRegress = sale.status === 'invoiced' || sale.status === 'partially_invoiced';

    // (3) Estoque: devolve a quantidade DESTA emissão, aos MESMOS lotes.
    await SaleStockService.restoreInvoicedStock(
      sale.id,
      snapshot.map((entry: any) => ({
        productId: Number(entry.product_id),
        quantity: Number(entry.quantity || 0),
      })),
      userId,
      transaction,
      {
        description: `NF-e ${sale.nfe_series}/${sale.nfe_number} cancelada - Venda #${sale.id} - estoque devolvido`,
        saleInvoiceId: saleInvoice?.id ?? undefined,
        reserve: willRegress,
      }
    );

    if (willRegress) {
      sale.status = anyStillInvoiced ? 'partially_invoiced' : 'confirmed';
    }

    // (4) Conta a receber desta emissão (ver JSDoc da classe).
    await this.cancelInvoiceReceivables({
      sale,
      invoiceNumber: saleInvoice?.nfe_number || sale.nfe_number,
      reason: params.reason,
      transaction,
    });
  }

  /**
   * Cancela as parcelas geradas por UMA emissão de NF-e.
   *
   * Só toca no que é inequívoco: parcela `pending` sem nenhum valor recebido.
   * Parcela com dinheiro dentro fica como está e ganha anotação — a decisão
   * (devolução/nota de crédito/abatimento) é do dono e do contador.
   *
   * @param params.sale - Venda dona das parcelas.
   * @param params.invoiceNumber - Número da nota cancelada (marca as parcelas desta emissão).
   * @param params.reason - Justificativa do cancelamento.
   * @param params.transaction - Transação ativa.
   * @returns void
   */
  private async cancelInvoiceReceivables(params: {
    sale: any;
    invoiceNumber: string | null;
    reason: string;
    transaction: Transaction;
  }): Promise<void> {
    const { sale, invoiceNumber, transaction } = params;
    if (!invoiceNumber) return;

    const receivables = await this.fiscalRepository.findReceivablesBySaleId(sale.id, { transaction });
    const stamp = new Date().toISOString().slice(0, 10);
    const retained: number[] = [];

    for (const parcel of receivables || []) {
      if (String(parcel.invoice_number || '') !== String(invoiceNumber)) continue;
      if (parcel.status === 'canceled') continue;

      const untouched = parcel.status === 'pending' && Number(parcel.amount_paid || 0) <= 0;
      const note = `[${stamp}] NF-e ${invoiceNumber} cancelada: ${params.reason}`;

      if (untouched) {
        await parcel.update({
          status: 'canceled',
          notes: parcel.notes ? `${parcel.notes}\n${note}` : note,
        }, { transaction });
        continue;
      }

      retained.push(Number(parcel.id));
      await parcel.update({
        notes: parcel.notes
          ? `${parcel.notes}\n${note} - parcela MANTIDA porque ja houve recebimento; decidir devolucao/nota de credito.`
          : `${note} - parcela MANTIDA porque ja houve recebimento; decidir devolucao/nota de credito.`,
      }, { transaction });
    }

    if (retained.length > 0) {
      logger.warn('[D-M] NF-e cancelada com parcela ja recebida: decisao financeira pendente', {
        sale_id: sale.id,
        invoice_number: invoiceNumber,
        receivable_ids: retained,
      });
    }
  }
}

module.exports = CancelSaleNfeUseCase;
