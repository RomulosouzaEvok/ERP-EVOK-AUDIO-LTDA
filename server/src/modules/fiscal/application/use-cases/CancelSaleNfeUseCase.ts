/**
 * Cancela a NF-e autorizada de uma venda (dentro do prazo legal de
 * cancelamento, tipicamente 24h — o provedor é quem valida esse prazo,
 * este use case não reimplementa a regra).
 *
 * @module modules/fiscal/application/use-cases/CancelSaleNfeUseCase
 */

import type { Transaction } from 'sequelize';
import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const createNfeProvider = require('../../infrastructure/providers/NfeProviderFactory');

interface CancelSaleNfeInput {
  saleId: number | string;
  reason: string;
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
   * @returns {Promise<Object>} A venda com a NF-e cancelada.
   */
  async execute({ saleId, reason }: CancelSaleNfeInput) {
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

      if (result.status === 'cancelled') {
        locked.nfe_status = 'cancelled';
        locked.nfe_error_message = null;
      } else {
        locked.nfe_error_message = result.error_message;
        throw new BusinessRuleError(result.error_message || 'Falha ao cancelar NF-e no provedor.');
      }

      await locked.save({ transaction });
      return locked;
    });
  }
}

module.exports = CancelSaleNfeUseCase;
