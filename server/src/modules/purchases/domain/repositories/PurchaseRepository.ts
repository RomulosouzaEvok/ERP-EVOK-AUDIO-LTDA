/**
 * Interface (contrato) de repositÃ³rio de Pedidos de Compra (Purchase Orders).
 *
 * Define os mÃ©todos que qualquer implementaÃ§Ã£o de persistÃªncia deve
 * fornecer. A camada de aplicaÃ§Ã£o (use cases) depende apenas desta
 * interface, nunca de uma implementaÃ§Ã£o concreta â€” isso mantÃ©m a regra de
 * negÃ³cio independente do Sequelize/PostgreSQL.
 */
class PurchaseRepository {
  /**
   * Lista pedidos de compra com filtros e paginaÃ§Ã£o.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, supplier_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listPurchases(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.listPurchases nÃ£o implementado.');
  }

  /**
   * Busca um pedido de compra pelo id, com fornecedor e itens (+ produto) incluÃ­dos.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findPurchaseById(id) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseById nÃ£o implementado.');
  }

  /**
   * Busca um pedido de compra "cru" (sem includes), opcionalmente dentro de uma transaÃ§Ã£o.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findPurchaseByIdRaw(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseByIdRaw nÃ£o implementado.');
  }

  /**
   * Busca um pedido de compra "cru" com lock pessimista na mesma transaÃ§Ã£o.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findPurchaseByIdRawForUpdate(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseByIdRawForUpdate nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.findPurchaseWithItems nÃ£o implementado.');
  }

  /**
   * Busca um pedido de compra com seus itens e lock pessimista para impedir
   * recebimentos concorrentes duplicados.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findPurchaseWithItemsForUpdate(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseWithItemsForUpdate nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.createPurchase nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.createPurchaseItem nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.updatePurchaseFields nÃ£o implementado.');
  }

  /**
   * Busca um produto pelo id (usado na validaÃ§Ã£o de itens do pedido).
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findProductById nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.findPurchaseItems nÃ£o implementado.');
  }

  /**
   * Lista os itens de um pedido de compra com lock pessimista.
   *
   * @abstract
   * @param {number} purchaseId
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object[]>}
   */
  async findPurchaseItemsForUpdate(purchaseId, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseItemsForUpdate nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.updatePurchaseItem nÃ£o implementado.');
  }

  /**
   * Busca uma conta a pagar jÃ¡ existente vinculada ao pedido de compra (idempotÃªncia).
   *
   * @abstract
   * @param {number} purchaseId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findAccountPayableByPurchaseId(purchaseId, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findAccountPayableByPurchaseId nÃ£o implementado.');
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
    throw new Error('PurchaseRepository.createAccountPayable nÃ£o implementado.');
  }
}

module.exports = PurchaseRepository;
