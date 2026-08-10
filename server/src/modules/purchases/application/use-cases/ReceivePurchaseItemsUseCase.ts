import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const WarehouseStockService = require('../../../../services/warehouseStockService');
const MaterialReceiptService = require('../../../../services/materialReceiptService');
const { resolveRequisitionStatusAfterReceipt } = require('../services/syncRequisitionReceiptStatus');
const { calculateReceiptAmount, resolvePayableDueDate } = require('../../domain/services/purchasePayableRules');
const { NotFoundError, ValidationError, BusinessRuleError, ConflictError } = require('../../../../errors');

const UNIQUE_VIOLATION = 'SequelizeUniqueConstraintError';

/** Origem de requisicao que direciona o recebimento para o Depósito do Laboratório por padrão (UC-39, Bloco 2, BUSINESS_RULES.md §9/§12 item 7). */
const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra';

interface ReceivePurchaseItemsInput {
  id: number | string;
  items: Array<Record<string, any>>;
  invoiceNumber: string;
  warehouseCode?: 'INSUMOS' | 'LABORATORIO';
  /** Data de emissão da NF do fornecedor (G13) — base do vencimento quando `dueDate` não é informado. */
  invoiceDate?: string | Date | null;
  /** Vencimento negociado desta NF (G13) — prevalece sobre qualquer cálculo. */
  dueDate?: string | Date | null;
  userId: number;
  transaction: Transaction;
}

/**
 * Resultado da criação (ou não) da conta a pagar deste recebimento (G13).
 * `payable` é `null` quando nada foi lançado, e `reason` explica por quê.
 */
interface ReceiptPayableResult {
  payable: any | null;
  amount: number;
  reason: 'created' | 'no_supplier' | 'zero_amount' | 'legacy_created_on_approval' | 'already_exists';
}

class ReceivePurchaseItemsUseCase extends UseCase {
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
   * @param {Array<{item_id:number, quantity:number}>} input.items
   * @param {string} input.invoiceNumber - Numero da NF do fornecedor deste recebimento (chave de deduplicacao).
   * @param {'INSUMOS'|'LABORATORIO'} [input.warehouseCode] - Deposito de destino (Bloco 4, UC-42 §12 item 7). Se omitido, o default e 'INSUMOS', EXCETO quando o pedido veio de uma requisicao com `origin='engenharia_amostra'` (Bloco 2, UC-39/§9), caso em que o default passa a ser 'LABORATORIO' automaticamente.
   * @param {string|Date} [input.invoiceDate] - Data de emissao da NF do fornecedor (G13): base do vencimento da conta a pagar quando `dueDate` nao e informado.
   * @param {string|Date} [input.dueDate] - Vencimento negociado desta NF (G13): quando informado, prevalece sobre qualquer calculo.
   * @param {number} input.userId
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ purchase: Object, previousStatus: string, requisitionStatus: string|null, payable: Object|null, payableSkipReason: string|null }>}
   *   `requisitionStatus` e o novo status da requisicao de origem quando o
   *   recebimento a fez avancar para `partial`/`received` (gap G15), ou
   *   `null` quando nao ha requisicao de origem ou nada mudou.
   *   `payable` e a conta a pagar criada por ESTE recebimento (gap G13), ou
   *   `null` quando nada foi lancado — nesse caso `payableSkipReason` diz o
   *   motivo (`no_supplier`, `zero_amount`, `legacy_created_on_approval`,
   *   `already_exists`).
   * @throws {ConflictError} Se esta NF (invoiceNumber) ja tiver sido registrada para este pedido.
   * @throws {ValidationError} Se invoiceNumber estiver ausente/vazio.
   *   `details: { purchase_id, order_number, field: 'invoice_number' }`.
   */
  async execute({ id, items, invoiceNumber, warehouseCode, invoiceDate, dueDate, userId, transaction }: ReceivePurchaseItemsInput) {
    const purchase = await this.purchaseRepository.findPurchaseWithItemsForUpdate(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido nao encontrado');
    }
    if (!['sent', 'partial'].includes(purchase.status)) {
      throw new BusinessRuleError('Apenas pedidos enviados ou com recebimento parcial podem ser recebidos');
    }
    if (!items || items.length === 0) {
      throw new ValidationError('Lista de itens e obrigatoria');
    }
    if (!invoiceNumber || !String(invoiceNumber).trim()) {
      throw new ValidationError(
        'Numero da NF (invoice_number) e obrigatorio para registrar o recebimento.',
        { purchase_id: purchase.id, order_number: purchase.order_number, field: 'invoice_number' }
      );
    }

    // Constraint unica (purchase_id, invoice_number) no banco: garante,
    // mesmo sob concorrencia real, que a mesma NF nao seja lancada duas
    // vezes contra o mesmo pedido (cada lancamento de recebimento exige
    // uma NF diferente).
    const normalizedInvoiceNumber = String(invoiceNumber).trim();
    const receivedAt = new Date();

    try {
      await this.purchaseRepository.createPurchaseReceipt({
        purchase_id: purchase.id,
        invoice_number: normalizedInvoiceNumber,
        received_by: userId,
        received_at: receivedAt,
      }, transaction);
    } catch (error) {
      if (error instanceof Error && error.name === UNIQUE_VIOLATION) {
        throw new ConflictError(`NF ${invoiceNumber} ja foi registrada para o pedido ${purchase.order_number}.`);
      }
      throw error;
    }

    const previousStatus = purchase.status;
    let generatedLotSequence = 0;
    // Linhas efetivamente recebidas NESTA entrega — base do valor da conta
    // a pagar do G13 (recebeu metade, deve a metade). Nunca
    // `purchase.total_amount`, que e o pedido inteiro.
    const receivedLines: Array<{ quantity: number; unitPrice: number }> = [];

    // Roteamento de deposito (Bloco 4, BUSINESS_RULES.md §12 item 7; Bloco 2,
    // UC-39/§9): quando o Recebimento informa `warehouseCode` explicitamente,
    // esse valor sempre prevalece. Quando NAO informa, o default deixa de
    // ser sempre 'INSUMOS': se o pedido tem `requisition_id` e a requisicao
    // de origem tem `origin='engenharia_amostra'`, o default passa a ser
    // 'LABORATORIO' automaticamente (sem exigir que o Recebimento saiba/
    // lembre de sinalizar manualmente a origem de amostra). Resolvido uma
    // unica vez para todo o recebimento.
    let defaultWarehouseCode = 'INSUMOS';
    if (!warehouseCode && purchase.requisition_id) {
      const requisition = await this.purchaseRepository.findRequisitionOriginById(purchase.requisition_id, transaction);
      if (requisition?.origin === ENGINEERING_SAMPLE_ORIGIN) {
        defaultWarehouseCode = 'LABORATORIO';
      }
    }
    const warehouse = await WarehouseStockService.getWarehouseByCode(warehouseCode || defaultWarehouseCode, transaction);

    for (const received of items) {
      if (!received.item_id || received.quantity === undefined) {
        throw new ValidationError('Cada item deve ter item_id e quantity');
      }
      const qty = parseFloat(received.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero');
      }

      const item = purchase.items.find((candidate: any) => candidate.id === parseInt(received.item_id, 10));
      if (!item) {
        throw new ValidationError(`Item ${received.item_id} nao encontrado`);
      }

      const currentReceived = parseFloat(item.received_quantity) || 0;
      const maxReceivable = parseFloat(item.quantity) - currentReceived;
      if (qty > maxReceivable) {
        throw new BusinessRuleError(`Quantidade excedente. Maximo: ${maxReceivable}`);
      }

      const newReceived = currentReceived + qty;
      const itemStatus = newReceived >= parseFloat(item.quantity) ? 'received' : 'partial';
      await this.purchaseRepository.updatePurchaseItem(item.id, { received_quantity: newReceived, status: itemStatus }, transaction);

      const unitCost = parseFloat(item.unit_price || 0);
      receivedLines.push({ quantity: qty, unitPrice: unitCost });

      const providedLotNumber = received.lot_number ? String(received.lot_number).trim() : '';
      generatedLotSequence += 1;
      const lotNumber = providedLotNumber || MaterialReceiptService.buildGeneratedLotNumber(
        purchase.order_number,
        item.id,
        generatedLotSequence
      );

      // Caminho UNICO de entrada de material comprado (gap G14): estoque +
      // dual-write de deposito + lote em quarentena + custo real, sempre na
      // mesma transacao. A importacao (ReceiveImportProcessUseCase) chama
      // exatamente esta funcao — antes ela tinha um caminho proprio, sem lote
      // e sem quarentena.
      await MaterialReceiptService.receiveMaterialIntoQuarantine({
        productId: item.product_id,
        quantity: qty,
        unitCost,
        userId,
        warehouseId: warehouse.id,
        lotNumber,
        lotLookup: {
          product_id: item.product_id,
          purchase_id: purchase.id,
          lot_number: lotNumber
        },
        lotOwnership: {
          supplier_id: purchase.supplier_id,
          purchase_id: purchase.id
        },
        lotDates: {
          receivedAt: received.received_at || purchase.delivery_date || purchase.invoice_date || new Date(),
          manufacturedAt: received.manufactured_at,
          expiresAt: received.expires_at
        },
        lotNotes: received.lot_notes,
        defaultLotNotes: `Recebimento PO ${purchase.order_number}`,
        movement: {
          description: `Recebimento PO ${purchase.order_number}`,
          referenceId: purchase.id,
          referenceType: 'purchase'
        },
        costing: {
          sourceType: 'purchase',
          sourceId: purchase.id,
          notes: `Custo real de compra - PO ${purchase.order_number}`
        },
        lotGateway: this.purchaseRepository,
        transaction
      });
    }

    const updatedItems = await this.purchaseRepository.findPurchaseItemsForUpdate(purchase.id, transaction);
    const allReceived = updatedItems.every((item: any) => item.status === 'received');
    purchase.status = allReceived ? 'received' : 'partial';
    await purchase.save({ transaction });

    const requisitionStatus = await this.syncRequisitionStatus(purchase, transaction);

    // Gap G13: o passivo nasce AQUI, na mesma transacao do recebimento.
    const payableResult = await this.createReceiptPayable({
      purchase,
      invoiceNumber: normalizedInvoiceNumber,
      invoiceDate,
      dueDate,
      receivedAt,
      receivedLines,
      userId,
      transaction,
    });

    return {
      purchase,
      previousStatus,
      requisitionStatus,
      payable: payableResult.payable,
      payableSkipReason: payableResult.reason === 'created' ? null : payableResult.reason,
    };
  }

  /**
   * Cria a conta a pagar DESTE recebimento (gap G13, decisao D-A do dono).
   *
   * ## Por que aqui e nao na aprovacao do pedido
   *
   * CPC 00 (R2) item 4.56: pedido aprovado e nao entregue e contrato
   * executorio. Item 4.58: o passivo surge quando a outra parte cumpre
   * primeiro — a entrega do fornecedor. Ate 2026-08-10 a AP nascia na
   * transicao `pending -> approved` (`ChangePurchaseStatusUseCase`), com o
   * valor do pedido inteiro e vencimento `expected_date + 30`.
   *
   * ## Recebimento parcial
   *
   * O valor e a soma de `quantidade recebida x preco unitario` **desta
   * entrega**. Um pedido de 100 recebido em 40 + 60 gera duas contas a
   * pagar, cada uma com a NF do fornecedor daquela entrega. E por isso que
   * a chave de idempotencia e o par (pedido, NF), o mesmo par que
   * `purchase_receipts` ja protege com indice unico.
   *
   * ## Migracao do dado existente (nao duplicar passivo)
   *
   * Pedido aprovado ANTES do corte ja carrega uma AP do valor cheio, criada
   * pela regra antiga. Ela e reconhecivel porque nasceu sem NF
   * (`invoice_number IS NULL`) — a nota nao existia na aprovacao. Quando
   * esse pedido e recebido depois do corte, este metodo **nao lanca nada** e
   * devolve `reason: 'legacy_created_on_approval'`. Nenhuma linha financeira
   * do dono e alterada ou apagada aqui: o destino dessas APs (estorno ou
   * congelamento) e a pergunta **C9** ao contador, ainda sem resposta
   * (`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`).
   *
   * ## Segregacao de funcoes
   *
   * `approved_by`/`approval_date` ficam **nulos**. Preenche-los com quem
   * recebeu seria afirmar que o recebedor aprovou o pagamento — exatamente
   * a confusao de papeis que o three-way match existe para evitar. Quem
   * recebeu fica registrado em `purchase_receipts.received_by`, em
   * `notes` e no log de auditoria.
   *
   * @param input.purchase - Pedido ja travado na transacao.
   * @param input.invoiceNumber - NF do fornecedor desta entrega (ja normalizada).
   * @param input.invoiceDate - Data de emissao da NF (opcional).
   * @param input.dueDate - Vencimento negociado (opcional; prevalece).
   * @param input.receivedAt - Momento do recebimento.
   * @param input.receivedLines - Quantidade x preco unitario de cada linha desta entrega.
   * @param input.userId - Usuario do JWT que registrou o recebimento (anti-spoofing).
   * @param input.transaction - Mesma transacao do recebimento.
   * @returns {Promise<ReceiptPayableResult>} A AP criada, ou o motivo de nao ter criado.
   */
  private async createReceiptPayable({
    purchase, invoiceNumber, invoiceDate, dueDate, receivedAt, receivedLines, userId, transaction,
  }: {
    purchase: any;
    invoiceNumber: string;
    invoiceDate?: string | Date | null;
    dueDate?: string | Date | null;
    receivedAt: Date;
    receivedLines: Array<{ quantity: number; unitPrice: number }>;
    userId: number;
    transaction: Transaction;
  }): Promise<ReceiptPayableResult> {
    const amount = calculateReceiptAmount(receivedLines);

    // Compra sem fornecedor cadastrado nao tem a quem pagar; o lancamento
    // fica manual (`POST /api/finance/payable`). Mesma postura defensiva da
    // regra anterior, que tambem saia cedo nesse caso.
    if (!purchase.supplier_id) return { payable: null, amount, reason: 'no_supplier' };
    if (amount <= 0) return { payable: null, amount, reason: 'zero_amount' };

    const legacyPayable = await this.purchaseRepository.findLegacyPayableByPurchaseId(purchase.id, transaction);
    if (legacyPayable) return { payable: null, amount, reason: 'legacy_created_on_approval' };

    const existing = await this.purchaseRepository.findAccountPayableByPurchaseAndInvoice(purchase.id, invoiceNumber, transaction);
    if (existing) return { payable: existing, amount, reason: 'already_exists' };

    const payable = await this.purchaseRepository.createAccountPayable({
      description: `NF ${invoiceNumber} - PO ${purchase.order_number}`,
      amount,
      due_date: resolvePayableDueDate({ dueDate, invoiceDate, receivedAt }),
      payment_date: null,
      status: 'pending',
      category: 'Fornecedores',
      supplier_id: purchase.supplier_id,
      purchase_id: purchase.id,
      invoice_number: invoiceNumber,
      barcode: null,
      payment_type: null,
      cost_center: null,
      // TODO(financeiro): mapear departamento da requisicao de origem
      // (`purchase.requisition_id` -> `purchase_requisitions.department_id`)
      // para `cost_center_id` quando o de-para departamento x centro de
      // custo for definido pelo negocio. Ate la a AP automatica nasce sem
      // centro de custo (NULL = "Sem centro de custo" no relatorio) e pode
      // ser atribuida depois em `PUT /api/finance/payable/:id/cost-center`.
      cost_center_id: null,
      // Segregacao de funcoes: recebedor NAO e aprovador de pagamento.
      approved_by: null,
      approval_date: null,
      notes: `Gerado no recebimento da NF ${invoiceNumber} do pedido ${purchase.order_number} (usuario #${userId})`,
    }, transaction);

    return { payable, amount, reason: 'created' };
  }

  /**
   * Reflete o recebimento na REQUISICAO de origem (gap G15).
   *
   * Antes de 2026-08-09 `purchase_requisitions.status` morria em `ordered`:
   * os valores `partial` e `received` existiam no ENUM e **nenhuma rotina do
   * sistema jamais os atingia**, entao nao havia como responder "esta
   * requisicao foi atendida?" — o elo final do rastro
   * requisicao -> pedido -> recebimento ficava aberto (rastreabilidade 100%,
   * CLAUDE.md §7).
   *
   * O gatilho e este ponto porque e o unico lugar que sabe, de fato, o que
   * chegou. A decisao (qual status resulta) fica na funcao pura
   * `resolveRequisitionStatusAfterReceipt`, que so olha o estado atual da
   * requisicao, o status de TODOS os pedidos gerados por ela e o saldo de
   * compra dos itens — recalculo completo, nunca incremental, para o
   * resultado nao depender da ordem dos recebimentos.
   *
   * Nao lanca erro: um pedido de compra avulso (sem `requisition_id`) e
   * legitimo, e uma requisicao ainda com saldo a comprar (`approved`)
   * permanece intocada de proposito — ver a justificativa completa em
   * `resolveRequisitionStatusAfterReceipt`.
   *
   * @param purchase - Pedido de compra ja com o status desta rodada salvo.
   * @param transaction - Transacao Sequelize ativa (a mesma do recebimento).
   * @returns Novo status da requisicao, ou `null` se nada mudou.
   */
  private async syncRequisitionStatus(purchase: any, transaction: Transaction): Promise<string | null> {
    if (!purchase.requisition_id) return null;

    // Lock pessimista: dois recebimentos simultaneos de pedidos DIFERENTES
    // da mesma requisicao recalculariam o status em paralelo e o ultimo a
    // gravar poderia regredir `received` para `partial`.
    const requisition = await this.purchaseRepository.findRequisitionByIdForUpdate(purchase.requisition_id, transaction);
    if (!requisition) return null;

    const [purchaseStatuses, requisitionItemStatuses] = await Promise.all([
      this.purchaseRepository.findPurchaseStatusesByRequisitionId(purchase.requisition_id, transaction),
      this.purchaseRepository.findRequisitionItemStatuses(purchase.requisition_id, transaction),
    ]);

    const nextStatus = resolveRequisitionStatusAfterReceipt({
      currentStatus: requisition.status,
      purchaseStatuses: purchaseStatuses.map((row: any) => row.status),
      requisitionItemStatuses: requisitionItemStatuses.map((row: any) => row.status),
    });

    if (!nextStatus) return null;

    await this.purchaseRepository.updateRequisitionStatus(purchase.requisition_id, nextStatus, transaction);
    return nextStatus;
  }
}

module.exports = ReceivePurchaseItemsUseCase;
