/**
 * Interface (contrato) de repositÃ³rio de Vendas.
 *
 * Define os mÃ©todos que qualquer implementaÃ§Ã£o de persistÃªncia deve
 * fornecer. A camada de aplicaÃ§Ã£o (use cases) depende apenas desta
 * interface, nunca de uma implementaÃ§Ã£o concreta â€” isso mantÃ©m a regra de
 * negÃ³cio independente do Sequelize/PostgreSQL.
 */
class SaleRepository {
  /**
   * Lista vendas com filtros e paginaÃ§Ã£o.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, customer_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listSales(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.listSales nÃ£o implementado.');
  }

  /**
   * Busca uma venda pelo id, com cliente e itens (+ produto) incluÃ­dos.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findSaleById(id) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findSaleById nÃ£o implementado.');
  }

  /**
   * Busca uma venda com seus itens (sem produto), para uso na troca de status.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findSaleWithItems(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findSaleWithItems nÃ£o implementado.');
  }

  /**
   * Busca uma venda com seus itens e lock pessimista para evitar dupla
   * restauraÃ§Ã£o de estoque em cancelamentos concorrentes.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findSaleWithItemsForUpdate(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findSaleWithItemsForUpdate nÃ£o implementado.');
  }

  /**
   * Busca um produto pelo id (usado na validaÃ§Ã£o de itens/estoque da venda).
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findProductById nÃ£o implementado.');
  }

  /**
   * Cria uma venda.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSale(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.createSale nÃ£o implementado.');
  }

  /**
   * Cria um item de venda.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSaleItem(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.createSaleItem nÃ£o implementado.');
  }

  /**
   * Cria uma conta a receber (parcela).
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createAccountReceivable(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.createAccountReceivable nÃ£o implementado.');
  }

  /**
   * Cancela todas as parcelas (`AccountReceivable`) pendentes/nÃ£o pagas de
   * uma venda (usado ao cancelar a venda).
   *
   * @abstract
   * @param {number} saleId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async cancelPendingReceivables(saleId, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.cancelPendingReceivables nÃ£o implementado.');
  }
}

module.exports = SaleRepository;
