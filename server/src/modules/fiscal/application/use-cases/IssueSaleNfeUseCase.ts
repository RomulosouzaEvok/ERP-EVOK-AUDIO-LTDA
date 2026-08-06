/**
 * Emite a NF-e de uma venda confirmada — total ou parcial.
 *
 * Fluxo (evita segurar lock de banco durante a chamada HTTP externa ao
 * provedor de NF-e):
 *   1. Transação curta: trava a venda, valida estado, resolve quais itens/
 *      quantidades entram nesta NF-e (total ou parcial — ver `items` no
 *      input), reserva série/número sequencial em `CompanyFiscalConfig`
 *      (lock pessimista), calcula e persiste os tributos de cada item
 *      (sobre a quantidade desta emissão), marca `nfe_status =
 *      'processing'`.
 *   2. Fora de transação: monta o payload e chama o provedor configurado.
 *   3. Transação curta: grava o resultado (autorizada/negada/processando)
 *      na venda; se autorizada, incrementa `invoiced_quantity` de cada
 *      item envolvido e transiciona `sale.status` conforme o saldo
 *      pendente total (`confirmed`/`partially_invoiced` -> `invoiced`
 *      quando não sobra saldo, ou -> `partially_invoiced` quando ainda
 *      resta saldo em algum item).
 *
 * FATURAMENTO PARCIAL (gap 3/3 do módulo `sales` —
 * `docs/LEVANTAMENTO_ERP_2026-08-02.md`, linha `sales`): quando o chamador
 * informa `items: [{ sale_item_id, quantity }]`, só essas quantidades
 * (limitadas ao saldo pendente de cada item) entram nesta NF-e; quando
 * omitido, preserva o comportamento anterior (fatura o saldo pendente
 * inteiro de todos os itens — que na primeira emissão é a quantidade cheia
 * da venda).
 *
 * LIMITAÇÃO CONHECIDA (residual, documentada no handoff): os campos
 * `nfe_*` ficam em `Sale` (uma única NF-e "atual" por venda) e os campos
 * fiscais (CST/alíquotas/valores) ficam em `SaleItem` (uma linha por
 * produto). Múltiplas emissões parciais para a mesma venda sobrescrevem
 * esses campos a cada chamada — o histórico completo de cada NF-e parcial
 * (chave, protocolo, XML/DANFE de cada emissão) NÃO é preservado
 * individualmente; apenas a última emissão fica visível em `Sale`, e
 * `SaleItem.invoiced_quantity` é o único registro cumulativo confiável do
 * saldo faturado. Uma tabela dedicada `sale_invoices`/`sale_invoice_items`
 * seria necessária para um histórico completo por emissão — fora do
 * escopo desta entrega (embarque parcial também está fora do escopo, por
 * decisão explícita da tarefa).
 *
 * @module modules/fiscal/application/use-cases/IssueSaleNfeUseCase
 */

import type { Transaction } from 'sequelize';
import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, BusinessRuleError, ConflictError, ValidationError } = require('../../../../errors');
const TaxCalculationService = require('../../domain/services/TaxCalculationService');
const createNfeProvider = require('../../infrastructure/providers/NfeProviderFactory');

interface IssueSaleNfeItemInput {
  sale_item_id: number;
  quantity: number;
}

interface IssueSaleNfeInput {
  saleId: number | string;
  items?: IssueSaleNfeItemInput[];
}

class IssueSaleNfeUseCase extends UseCase {
  private fiscalRepository: FiscalRepository;

  /** @param {import('../../domain/repositories/FiscalRepository')} fiscalRepository */
  constructor(fiscalRepository: FiscalRepository) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.saleId
   * @param {Array<{sale_item_id:number, quantity:number}>} [input.items] - Faturamento parcial: quando informado, fatura apenas estas quantidades (limitadas ao saldo pendente de cada item); quando omitido, fatura o saldo pendente inteiro de todos os itens.
   * @returns {Promise<Object>} A venda atualizada com o resultado da emissão.
   * @throws {BusinessRuleError} Se o status da venda não permitir faturamento, se não houver saldo pendente para faturar, ou se alguma quantidade solicitada exceder o saldo pendente do item.
   */
  async execute({ saleId, items: requestedItems }: IssueSaleNfeInput) {
    const reserved = await sequelize.transaction(async (transaction: Transaction) => {
      const sale = await this.fiscalRepository.findSaleById(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) throw new NotFoundError('Venda não encontrada');

      // Faturamento parcial (gap 3/3): uma venda 'partially_invoiced' ainda
      // tem saldo pendente e pode receber novas emissões, além da
      // 'confirmed' original (primeira emissão, total ou parcial).
      if (sale.status !== 'confirmed' && sale.status !== 'partially_invoiced') {
        throw new BusinessRuleError(`Apenas vendas 'confirmed' ou 'partially_invoiced' podem ser faturadas. Status atual: '${sale.status}'.`);
      }
      if (sale.nfe_status === 'processing') {
        throw new ConflictError('Já existe uma emissão de NF-e em andamento para esta venda.');
      }

      const allItems = await this.fiscalRepository.findSaleItemsBySaleId(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (allItems.length === 0) throw new BusinessRuleError('Venda sem itens não pode ser faturada.');

      const allItemsById = new Map<number, any>(allItems.map((item: any) => [item.id, item]));
      const remaining = (item: any) => parseFloat(item.quantity) - parseFloat(item.invoiced_quantity || 0);

      // Resolve a quantidade a faturar de cada item nesta emissão: payload
      // explícito (parcial) ou saldo pendente inteiro de todo item que
      // ainda tenha saldo (comportamento anterior, preservado).
      const qtyToInvoiceByItemId = new Map<number, number>();
      if (requestedItems && requestedItems.length > 0) {
        for (const requested of requestedItems) {
          const item = allItemsById.get(requested.sale_item_id);
          if (!item) throw new NotFoundError(`Item #${requested.sale_item_id} não pertence a esta venda.`);

          const qty = parseFloat(String(requested.quantity));
          if (!Number.isFinite(qty) || qty <= 0) {
            throw new ValidationError(`Quantidade a faturar do item #${requested.sale_item_id} deve ser maior que zero.`);
          }
          const itemRemaining = remaining(item);
          if (qty > itemRemaining + 1e-9) {
            throw new BusinessRuleError(
              `Quantidade a faturar (${qty}) do item #${requested.sale_item_id} excede o saldo pendente (${itemRemaining}).`,
              { sale_item_id: requested.sale_item_id, requested: qty, remaining: itemRemaining }
            );
          }
          qtyToInvoiceByItemId.set(item.id, qty);
        }
      } else {
        for (const item of allItems) {
          const itemRemaining = remaining(item);
          if (itemRemaining > 1e-9) qtyToInvoiceByItemId.set(item.id, itemRemaining);
        }
      }

      if (qtyToInvoiceByItemId.size === 0) {
        throw new BusinessRuleError('Não há saldo pendente para faturar nesta venda.');
      }

      const items = allItems.filter((item: any) => qtyToInvoiceByItemId.has(item.id));

      const client = await this.fiscalRepository.findClientById(sale.customer_id, { transaction });
      if (!client) throw new NotFoundError('Cliente da venda não encontrado.');

      let config = await this.fiscalRepository.findCompanyFiscalConfig({ transaction, lock: transaction.LOCK.UPDATE });
      if (!config) {
        throw new BusinessRuleError('Configuração fiscal da empresa (CompanyFiscalConfig) não cadastrada. Cadastre os dados do emitente antes de emitir NF-e.');
      }
      if (!config.city_ibge_code || !config.cnpj) {
        throw new BusinessRuleError('Configuração fiscal da empresa incompleta (CNPJ/código IBGE do município são obrigatórios).');
      }

      const reservedNumber = config.nfe_next_number;
      config.nfe_next_number += 1;
      await config.save({ transaction });

      const productIds = items.map((item: any) => item.product_id);
      const products = await this.fiscalRepository.findProductsByIds(productIds, { transaction });
      const productById = new Map<number, any>(products.map((p: any) => [p.id, p]));

      const itemsForProvider = [];
      let totalAmount = 0;
      for (const item of items) {
        const product = productById.get(item.product_id);
        if (!product) throw new NotFoundError(`Produto #${item.product_id} do item da venda não encontrado.`);

        // Quantidade/valor desta emissão (pode ser parcial) — NÃO a
        // quantidade total do item, para o cálculo tributário e o payload
        // do provedor refletirem exatamente o que está sendo faturado
        // agora (ver LIMITAÇÃO CONHECIDA no JSDoc da classe).
        const invoiceQty = qtyToInvoiceByItemId.get(item.id)!;
        const unitPrice = parseFloat(item.unit_price);
        const invoiceTotal = Math.round(invoiceQty * unitPrice * 100) / 100;
        totalAmount += invoiceTotal;

        const tax = TaxCalculationService.calculateItem(
          { state: config.state, crt: config.crt },
          { state: client.state, tax_regime: client.tax_regime, ind_ie: client.ind_ie },
          {
            product_type: product.product_type,
            ncm: product.ncm,
            quantity: invoiceQty,
            unit_price: unitPrice,
            total_price: invoiceTotal,
          }
        );

        Object.assign(item, tax);
        await item.save({ transaction });

        itemsForProvider.push({
          code: product.code,
          description: product.name,
          ncm: product.ncm,
          unit: product.unit,
          quantity: invoiceQty,
          unit_price: unitPrice,
          total_price: invoiceTotal,
          ...tax,
        });
      }

      const ref = `sale-${sale.id}-${config.nfe_series}-${reservedNumber}`;
      sale.nfe_status = 'processing';
      sale.nfe_series = config.nfe_series;
      sale.nfe_number = String(reservedNumber);
      sale.nfe_environment = config.nfe_environment;
      sale.nfe_provider_ref = ref;
      sale.nfe_error_message = null;
      await sale.save({ transaction });

      return {
        ref,
        series: config.nfe_series,
        number: reservedNumber,
        environment: config.nfe_environment,
        provider: config.nfe_provider,
        company: config,
        client,
        items: itemsForProvider,
        totalAmount,
        // Repassado à transação final (fora deste closure) para
        // incrementar SaleItem.invoiced_quantity e recalcular o status da
        // venda apenas com base no que foi de fato autorizado.
        qtyToInvoiceByItemId,
      };
    });

    const provider = createNfeProvider(reserved.provider);
    let result;
    try {
      result = await provider.issue({
        ref: reserved.ref,
        environment: reserved.environment,
        company: {
          cnpj: reserved.company.cnpj,
          legal_name: reserved.company.legal_name,
          ie: reserved.company.ie,
          crt: reserved.company.crt,
          address: {
            cep: reserved.company.cep,
            street: reserved.company.street,
            number: reserved.company.number,
            complement: reserved.company.complement,
            neighborhood: reserved.company.neighborhood,
            city: reserved.company.city,
            city_ibge_code: reserved.company.city_ibge_code,
            state: reserved.company.state,
          },
        },
        client: {
          name: reserved.client.name,
          cpf_cnpj: reserved.client.cpf_cnpj,
          ie: reserved.client.ie,
          ind_ie: reserved.client.ind_ie,
          email: reserved.client.email,
          address: {
            cep: reserved.client.cep,
            street: reserved.client.street,
            number: reserved.client.number,
            complement: reserved.client.complement,
            neighborhood: reserved.client.neighborhood,
            city: reserved.client.city,
            city_ibge_code: reserved.client.city_ibge_code,
            state: reserved.client.state,
          },
        },
        series: reserved.series,
        number: reserved.number,
        items: reserved.items,
        total_amount: reserved.totalAmount,
      });
    } catch (error) {
      result = {
        status: 'denied',
        key: null, number: null, series: null, protocol: null,
        xml_url: null, danfe_url: null,
        provider_ref: reserved.ref,
        error_message: error instanceof Error ? error.message : 'Erro desconhecido ao comunicar com o provedor de NF-e.',
      };
    }

    return sequelize.transaction(async (transaction: Transaction) => {
      const sale = await this.fiscalRepository.findSaleById(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) throw new NotFoundError('Venda não encontrada');

      sale.nfe_status = result.status;
      sale.nfe_key = result.key || sale.nfe_key;
      sale.nfe_protocol = result.protocol || sale.nfe_protocol;
      sale.nfe_xml_url = result.xml_url || sale.nfe_xml_url;
      sale.nfe_danfe_url = result.danfe_url || sale.nfe_danfe_url;
      sale.nfe_error_message = result.error_message;

      if (result.status === 'authorized') {
        sale.nfe_issued_at = new Date();

        // Faturamento parcial (gap 3/3): incrementa invoiced_quantity de
        // cada item envolvido nesta emissão e recalcula o status da venda
        // com base no saldo pendente TOTAL (não apenas nesta emissão).
        const allItems = await this.fiscalRepository.findSaleItemsBySaleId(saleId, { transaction, lock: transaction.LOCK.UPDATE });
        let anyRemaining = false;
        for (const item of allItems) {
          const invoiceQty = reserved.qtyToInvoiceByItemId.get(item.id);
          if (invoiceQty) {
            item.invoiced_quantity = parseFloat(item.invoiced_quantity || 0) + invoiceQty;
            await item.save({ transaction });
          }
          if (parseFloat(item.quantity) - parseFloat(item.invoiced_quantity || 0) > 1e-9) {
            anyRemaining = true;
          }
        }

        if (sale.status === 'confirmed' || sale.status === 'partially_invoiced') {
          sale.status = anyRemaining ? 'partially_invoiced' : 'invoiced';
        }
      }

      await sale.save({ transaction });
      return sale;
    });
  }
}

module.exports = IssueSaleNfeUseCase;
