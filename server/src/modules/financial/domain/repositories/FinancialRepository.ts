/**
 * Interface (contrato) de repositÃ³rio do mÃ³dulo Financeiro (contas a
 * receber, contas a pagar e fluxo de caixa).
 *
 * Define os mÃ©todos que qualquer implementaÃ§Ã£o de persistÃªncia deve
 * fornecer. A camada de aplicaÃ§Ã£o (use cases) depende apenas desta
 * interface, nunca de uma implementaÃ§Ã£o concreta.
 */
class FinancialRepository {
  /**
   * Lista contas a receber com filtros e paginaÃ§Ã£o.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, customer_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listReceivables(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.listReceivables nÃ£o implementado.');
  }

  /**
   * Busca uma conta a receber pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findReceivableById(id) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findReceivableById nÃ£o implementado.');
  }

  /**
   * Busca uma conta a receber com lock pessimista para impedir baixa dupla.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findReceivableByIdForUpdate(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findReceivableByIdForUpdate nÃ£o implementado.');
  }

  /**
   * Lista contas a pagar com filtros e paginaÃ§Ã£o.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listPayables(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.listPayables nÃ£o implementado.');
  }

  /**
   * Busca uma conta a pagar pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findPayableById(id) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findPayableById nÃ£o implementado.');
  }

  /**
   * Busca uma conta a pagar com lock pessimista para impedir pagamento duplo.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findPayableByIdForUpdate(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findPayableByIdForUpdate nÃ£o implementado.');
  }

  /**
   * Cria uma conta a pagar.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createPayable(data) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.createPayable nÃ£o implementado.');
  }

  /**
   * Soma valores de contas a receber agrupados por status, em um intervalo de datas.
   *
   * @abstract
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Array<{status: string, total: number}>>}
   */
  async sumReceivableByStatus(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.sumReceivableByStatus nÃ£o implementado.');
  }

  /**
   * Soma valores de contas a pagar agrupados por status, em um intervalo de datas.
   *
   * @abstract
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Array<{status: string, total: number}>>}
   */
  async sumPayableByStatus(start, end) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.sumPayableByStatus nÃ£o implementado.');
  }
}

module.exports = FinancialRepository;
