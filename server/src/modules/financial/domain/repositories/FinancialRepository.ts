/**
 * Interface (contrato) de repositório do módulo Financeiro (contas a
 * receber, contas a pagar e fluxo de caixa).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class FinancialRepository {
  /**
   * Lista contas a receber com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, customer_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listReceivables(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.listReceivables não implementado.');
  }

  /**
   * Busca uma conta a receber pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findReceivableById(id) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findReceivableById não implementado.');
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
    throw new Error('FinancialRepository.findReceivableByIdForUpdate não implementado.');
  }

  /**
   * Lista contas a pagar com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listPayables(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.listPayables não implementado.');
  }

  /**
   * Busca uma conta a pagar pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findPayableById(id) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findPayableById não implementado.');
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
    throw new Error('FinancialRepository.findPayableByIdForUpdate não implementado.');
  }

  /**
   * Cria uma conta a pagar.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createPayable(data) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.createPayable não implementado.');
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
    throw new Error('FinancialRepository.sumReceivableByStatus não implementado.');
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
    throw new Error('FinancialRepository.sumPayableByStatus não implementado.');
  }

  /**
   * Retorna os títulos em aberto (`payment_date IS NULL` e status não
   * cancelado) de contas a receber e a pagar, dentro do horizonte
   * `[hoje, hoje + days]`, mais os títulos vencidos e não pagos (sem limite
   * de data futura) — usado na projeção de fluxo de caixa (SQL raw
   * parametrizado).
   *
   * @abstract
   * @param {number} days - Horizonte em dias a partir de hoje.
   * @returns {Promise<{
   *   receivableRows: Array<{ due_date: string, amount: number }>,
   *   payableRows: Array<{ due_date: string, amount: number }>,
   *   overdueReceivable: number,
   *   overduePayable: number
   * }>}
   */
  async getOpenTitlesForProjection(days) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.getOpenTitlesForProjection não implementado.');
  }
}

module.exports = FinancialRepository;

