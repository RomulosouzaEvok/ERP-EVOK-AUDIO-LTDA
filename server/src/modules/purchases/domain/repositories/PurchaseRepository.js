/**
 * Interface (contrato) de repositório de Pedidos de Compra (Purchase Orders).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/MySQL.
 */
class PurchaseRepository {
  /**
   * Lista pedidos de compra com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, supplier_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listPurchases(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.listPurchases não implementado.');
  }

  /**
   * Busca um pedido de compra pelo id, com fornecedor e itens (+ produto) incluídos.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findPurchaseById(id) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseById não implementado.');
  }

  /**
   * Busca um pedido de compra "cru" (sem includes), opcionalmente dentro de uma transação.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findPurchaseByIdRaw(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseByIdRaw não implementado.');
  }

  /**
   * Busca um pedido de compra com seus itens (sem produto), para uso no recebimento.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findPurchaseWithItems(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseWithItems não implementado.');
  }

  /**
   * Cria um pedido de compra.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createPurchase(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createPurchase não implementado.');
  }

  /**
   * Cria um item de pedido de compra.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createPurchaseItem(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createPurchaseItem não implementado.');
  }

  /**
   * Atualiza campos permitidos de um pedido de compra.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async updatePurchaseFields(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.updatePurchaseFields não implementado.');
  }

  /**
   * Busca um produto pelo id (usado na validação de itens do pedido).
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findProductById não implementado.');
  }

  /**
   * Lista os itens de um pedido de compra.
   *
   * @abstract
   * @param {number} purchaseId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object[]>}
   */
  async findPurchaseItems(purchaseId, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseItems não implementado.');
  }

  /**
   * Atualiza um item de pedido de compra.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async updatePurchaseItem(id, data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.updatePurchaseItem não implementado.');
  }

  /**
   * Busca uma conta a pagar já existente vinculada ao pedido de compra (idempotência).
   *
   * @abstract
   * @param {number} purchaseId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findAccountPayableByPurchaseId(purchaseId, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findAccountPayableByPurchaseId não implementado.');
  }

  /**
   * Cria uma conta a pagar.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createAccountPayable(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createAccountPayable não implementado.');
  }
}

module.exports = PurchaseRepository;
