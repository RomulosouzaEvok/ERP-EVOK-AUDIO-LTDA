/**
 * Consulta o status atual da NF-e de uma venda diretamente no provedor
 * (nunca confia apenas no valor já persistido, que pode estar
 * desatualizado enquanto a emissão está `processing`) e reconcilia o
 * registro local. Usado tanto para consulta manual (`GET /nfe`) quanto
 * como reação a um webhook de notificação do provedor (o webhook apenas
 * dispara esta reconsulta, nunca aplica o payload recebido diretamente).
 *
 * RECONCILIAÇÃO ASSÍNCRONA DE PROVEDORES REAIS (2026-08-06 —
 * `docs/governance/TODO.md`): antes desta rodada, quando o provedor real
 * (`focus_nfe`/`enotas`) confirmava a autorização de forma assíncrona (via
 * este caminho, e não o síncrono de `IssueSaleNfeUseCase`), este use case
 * só finalizava `confirmed -> invoiced` — não incrementava
 * `SaleItem.invoiced_quantity` nem aplicava `partially_invoiced`. Corrigido
 * reutilizando a MESMA lógica de acúmulo do caminho síncrono
 * (`SaleInvoiceAccumulator`, extraída para evitar duplicação), agora
 * possível porque o snapshot de itens/quantidades de cada emissão fica
 * disponível em `sale_invoices.items` (histórico multi-NF-e) mesmo depois
 * que o processo que iniciou a emissão já retornou a resposta HTTP.
 *
 * @module modules/fiscal/application/use-cases/GetSaleNfeStatusUseCase
 */

import type { Transaction } from 'sequelize';
import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const createNfeProvider = require('../../infrastructure/providers/NfeProviderFactory');
const SaleInvoiceAccumulator = require('../../domain/services/SaleInvoiceAccumulator');

interface GetSaleNfeStatusInput {
  saleId: number | string;
}

class GetSaleNfeStatusUseCase extends UseCase {
  private fiscalRepository: FiscalRepository;

  /** @param {import('../../domain/repositories/FiscalRepository')} fiscalRepository */
  constructor(fiscalRepository: FiscalRepository) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.saleId
   * @returns {Promise<Object>} A venda com o status de NF-e reconciliado.
   */
  async execute({ saleId }: GetSaleNfeStatusInput) {
    const sale = await this.fiscalRepository.findSaleById(saleId);
    if (!sale) throw new NotFoundError('Venda não encontrada');

    if (!sale.nfe_provider_ref) {
      // Nenhuma emissao foi iniciada ainda; retorna o estado atual sem
      // consultar nada externamente.
      return sale;
    }

    if (sale.nfe_status === 'authorized' || sale.nfe_status === 'cancelled') {
      // Estado terminal — nada a reconciliar.
      return sale;
    }

    const config = await this.fiscalRepository.findCompanyFiscalConfig();
    if (!config) throw new BusinessRuleError('Configuração fiscal da empresa não cadastrada.');

    const provider = createNfeProvider(config.nfe_provider);
    const result = await provider.queryStatus(sale.nfe_provider_ref);

    return sequelize.transaction(async (transaction: Transaction) => {
      const locked = await this.fiscalRepository.findSaleById(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) throw new NotFoundError('Venda não encontrada');

      // Histórico multi-NF-e (2026-08-06): localiza o registro da emissão
      // em andamento pela mesma referência armazenada em
      // `Sale.nfe_provider_ref` — é dele que vem o snapshot de
      // itens/quantidades desta emissão específica (indisponível em
      // qualquer outro lugar neste ponto, já que o processo que iniciou a
      // emissão pode ter terminado há muito tempo).
      const saleInvoice = sale.nfe_provider_ref
        ? await this.fiscalRepository.findSaleInvoiceByProviderRef(sale.nfe_provider_ref, { transaction, lock: transaction.LOCK.UPDATE })
        : null;

      // Idempotência: se o registro de emissão já está em estado terminal
      // (ex.: uma reconsulta concorrente já aplicou o resultado), não
      // reaplica o acúmulo de invoiced_quantity/transição de status.
      const alreadyReconciled = saleInvoice && saleInvoice.nfe_status !== 'processing';

      locked.nfe_status = result.status;
      locked.nfe_key = result.key || locked.nfe_key;
      locked.nfe_protocol = result.protocol || locked.nfe_protocol;
      locked.nfe_xml_url = result.xml_url || locked.nfe_xml_url;
      locked.nfe_danfe_url = result.danfe_url || locked.nfe_danfe_url;
      locked.nfe_error_message = result.error_message;

      if (saleInvoice && !alreadyReconciled) {
        saleInvoice.nfe_status = result.status;
        saleInvoice.nfe_key = result.key || saleInvoice.nfe_key;
        saleInvoice.nfe_protocol = result.protocol || saleInvoice.nfe_protocol;
        saleInvoice.nfe_xml_url = result.xml_url || saleInvoice.nfe_xml_url;
        saleInvoice.nfe_danfe_url = result.danfe_url || saleInvoice.nfe_danfe_url;
        saleInvoice.nfe_error_message = result.error_message;
      }

      if (result.status === 'authorized') {
        locked.nfe_issued_at = locked.nfe_issued_at || new Date();
        if (saleInvoice) saleInvoice.nfe_issued_at = saleInvoice.nfe_issued_at || locked.nfe_issued_at;

        // Aplica a MESMA lógica de acúmulo do caminho síncrono
        // (`IssueSaleNfeUseCase`), agora possível porque `saleInvoice.items`
        // guarda exatamente quais linhas/quantidades fazem parte desta
        // emissão. Sem o registro de emissão (venda antiga, anterior a
        // esta rodada, sem backfill de `items` granular) cai no
        // comportamento anterior — apenas finaliza `confirmed -> invoiced`,
        // sem tocar `invoiced_quantity` (não há como saber quais itens
        // pertencem à emissão sem o snapshot).
        if (saleInvoice && !alreadyReconciled) {
          const qtyToInvoiceByItemId = new Map<number, number>(
            (saleInvoice.items || []).map((entry: any) => [entry.sale_item_id, parseFloat(String(entry.quantity))])
          );
          const allItems = await this.fiscalRepository.findSaleItemsBySaleId(saleId, { transaction, lock: transaction.LOCK.UPDATE });
          const { updates, anyRemaining } = SaleInvoiceAccumulator.applyInvoicedQuantities(allItems, qtyToInvoiceByItemId);
          for (const { item, newInvoicedQuantity } of updates) {
            item.invoiced_quantity = newInvoicedQuantity;
            await item.save({ transaction });
          }

          locked.status = SaleInvoiceAccumulator.resolveSaleStatus(locked.status, anyRemaining);
        } else if (locked.status === 'confirmed') {
          // Fallback (sem registro de emissão correspondente): preserva o
          // comportamento anterior.
          locked.status = 'invoiced';
        }
      }

      if (saleInvoice && !alreadyReconciled) await saleInvoice.save({ transaction });
      await locked.save({ transaction });
      return locked;
    });
  }
}

module.exports = GetSaleNfeStatusUseCase;
