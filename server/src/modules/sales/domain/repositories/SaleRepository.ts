import type { Transaction } from 'sequelize';

/**
 * Interface (contrato) de repositório de Vendas.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/PostgreSQL.
 */
class SaleRepository {
  /**
   * Lista vendas com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, customer_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listSales(filters?: Record<string, unknown>, pagination?: Record<string, unknown>): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.listSales não implementado.');
  }

  /**
   * Busca uma venda pelo id, com cliente e itens (+ produto) incluídos.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findSaleById(id: number): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findSaleById não implementado.');
  }

  /**
   * Busca uma venda com seus itens (sem produto), para uso na troca de status.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findSaleWithItems(id: number, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findSaleWithItems não implementado.');
  }

  /**
   * Busca uma venda com seus itens e lock pessimista para evitar dupla
   * restauração de estoque em cancelamentos concorrentes.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findSaleWithItemsForUpdate(id: number, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findSaleWithItemsForUpdate não implementado.');
  }

  /**
   * Busca um produto pelo id (usado na validação de itens/estoque da venda).
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id: number, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.findProductById não implementado.');
  }

  /**
   * Cria uma venda.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSale(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.createSale não implementado.');
  }

  /**
   * Cria um item de venda.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSaleItem(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.createSaleItem não implementado.');
  }

  /**
   * Cria uma conta a receber (parcela).
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createAccountReceivable(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.createAccountReceivable não implementado.');
  }

  /**
   * Cancela todas as parcelas (`AccountReceivable`) pendentes/não pagas de
   * uma venda (usado ao cancelar a venda).
   *
   * @abstract
   * @param {number} saleId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async cancelPendingReceivables(saleId: number, transaction?: Transaction): Promise<void> { // eslint-disable-line no-unused-vars
    throw new Error('SaleRepository.cancelPendingReceivables não implementado.');
  }
}

module.exports = SaleRepository;
