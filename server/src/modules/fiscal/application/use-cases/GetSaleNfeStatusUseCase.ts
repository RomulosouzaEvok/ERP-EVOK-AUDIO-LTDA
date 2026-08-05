/**
 * Consulta o status atual da NF-e de uma venda diretamente no provedor
 * (nunca confia apenas no valor já persistido, que pode estar
 * desatualizado enquanto a emissão está `processing`) e reconcilia o
 * registro local. Usado tanto para consulta manual (`GET /nfe`) quanto
 * como reação a um webhook de notificação do provedor (o webhook apenas
 * dispara esta reconsulta, nunca aplica o payload recebido diretamente).
 *
 * @module modules/fiscal/application/use-cases/GetSaleNfeStatusUseCase
 */

import type { Transaction } from 'sequelize';
import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const createNfeProvider = require('../../infrastructure/providers/NfeProviderFactory');

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

      locked.nfe_status = result.status;
      locked.nfe_key = result.key || locked.nfe_key;
      locked.nfe_protocol = result.protocol || locked.nfe_protocol;
      locked.nfe_xml_url = result.xml_url || locked.nfe_xml_url;
      locked.nfe_danfe_url = result.danfe_url || locked.nfe_danfe_url;
      locked.nfe_error_message = result.error_message;

      if (result.status === 'authorized') {
        locked.nfe_issued_at = locked.nfe_issued_at || new Date();
        if (locked.status === 'confirmed') {
          locked.status = 'invoiced';
        }
      }

      await locked.save({ transaction });
      return locked;
    });
  }
}

module.exports = GetSaleNfeStatusUseCase;
