/**
 * Lista o histórico de emissões de NF-e de uma venda (`sale_invoices`,
 * histórico multi-NF-e por pedido — 2026-08-06,
 * `docs/governance/TODO.md`), mais recente primeiro.
 *
 * @module modules/fiscal/application/use-cases/ListSaleInvoicesUseCase
 */

import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

interface ListSaleInvoicesInput {
  saleId: number | string;
}

class ListSaleInvoicesUseCase extends UseCase {
  private fiscalRepository: FiscalRepository;

  /** @param {import('../../domain/repositories/FiscalRepository')} fiscalRepository */
  constructor(fiscalRepository: FiscalRepository) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.saleId
   * @returns {Promise<Object[]>} Emissões de NF-e da venda, mais recente primeiro.
   * @throws {NotFoundError} Se a venda não existir.
   */
  async execute({ saleId }: ListSaleInvoicesInput) {
    const sale = await this.fiscalRepository.findSaleById(saleId);
    if (!sale) throw new NotFoundError('Venda não encontrada');

    return this.fiscalRepository.findSaleInvoicesBySaleId(saleId);
  }
}

module.exports = ListSaleInvoicesUseCase;
