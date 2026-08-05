import type { Transaction } from 'sequelize';

/**
 * Interface (contrato) de repositório de Pedidos de Compra (Purchase Orders).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/PostgreSQL.
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
  async listPurchases(filters?: Record<string, unknown>, pagination?: Record<string, unknown>): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.listPurchases não implementado.');
  }

  /**
   * Busca um pedido de compra pelo id, com fornecedor e itens (+ produto) incluídos.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findPurchaseById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
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
  async findPurchaseByIdRaw(id: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseByIdRaw não implementado.');
  }

  /**
   * Busca um pedido de compra "cru" com lock pessimista na mesma transação.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findPurchaseByIdRawForUpdate(id: number | string, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseByIdRawForUpdate não implementado.');
  }

  /**
   * Busca um pedido de compra com seus itens (sem produto), para uso no recebimento.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findPurchaseWithItems(id: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseWithItems não implementado.');
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
  async findPurchaseWithItemsForUpdate(id: number | string, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseWithItemsForUpdate não implementado.');
  }

  /**
   * Cria um pedido de compra.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createPurchase(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
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
  async createPurchaseItem(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createPurchaseItem não implementado.');
  }

  /**
   * Atualiza campos permitidos de um pedido de compra.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async updatePurchaseFields(id: number | string, data: Record<string, unknown>, transaction?: Transaction): Promise<void> { // eslint-disable-line no-unused-vars
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
  async findProductById(id: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findProductById não implementado.');
  }

  /**
   * Busca um produto legado (`products`) pelo código (`products.code`).
   * Usado na conversão de requisição de compra em pedido, para resolver o
   * `product_id` legado exigido por `purchase_order_items` a partir do
   * `codigo` do `Item` (modelo canônico) referenciado na requisição.
   *
   * @abstract
   * @param {string} code
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductByCode(code: string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findProductByCode não implementado.');
  }

  /**
   * Lista os itens de um pedido de compra.
   *
   * @abstract
   * @param {number} purchaseId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object[]>}
   */
  async findPurchaseItems(purchaseId: number | string, transaction?: Transaction): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseItems não implementado.');
  }

  /**
   * Lista os itens de um pedido de compra com lock pessimista.
   *
   * @abstract
   * @param {number} purchaseId
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object[]>}
   */
  async findPurchaseItemsForUpdate(purchaseId: number | string, transaction: Transaction): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findPurchaseItemsForUpdate não implementado.');
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
  async updatePurchaseItem(id: number | string, data: Record<string, unknown>, transaction?: Transaction): Promise<void> { // eslint-disable-line no-unused-vars
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
  async findAccountPayableByPurchaseId(purchaseId: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
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
  async createAccountPayable(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createAccountPayable não implementado.');
  }

  /**
   * Calcula as métricas agregadas do cockpit de compras (SQL raw
   * parametrizado): requisições pendentes, pedidos em aberto (contagem e
   * valor total), pedidos chegando nos próximos 7 dias e pedidos em atraso
   * (data prevista vencida sem recebimento).
   *
   * @abstract
   * @returns {Promise<{
   *   pending_requisitions: number,
   *   open_orders: { count: number, total_amount: number },
   *   arriving_this_week: number,
   *   overdue: number
   * }>}
   */
  async getCockpitMetrics() {
    throw new Error('PurchaseRepository.getCockpitMetrics não implementado.');
  }

  /**
   * Cria o registro de recebimento (`PurchaseReceipt`) de uma NF do
   * fornecedor contra o pedido — a constraint única
   * `(purchase_id, invoice_number)` no banco garante idempotência mesmo sob
   * concorrência (ver `ReceivePurchaseItemsUseCase`).
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object>}
   */
  async createPurchaseReceipt(data: Record<string, unknown>, transaction: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createPurchaseReceipt não implementado.');
  }

  /**
   * Busca a origem (`origin`) de uma requisição de compra (leitura
   * cross-module pontual — `PurchaseRequisition` pertence ao próprio módulo
   * `purchases`, mas este método é usado apenas para resolver o depósito
   * padrão de recebimento, ver `ReceivePurchaseItemsUseCase`).
   *
   * @abstract
   * @param {number|string} requisitionId
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findRequisitionOriginById(requisitionId: number | string, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findRequisitionOriginById não implementado.');
  }

  /**
   * Busca um lote (`LotControl`) por produto, pedido de compra e número de
   * lote, com lock pessimista (leitura/escrita cross-module pontual —
   * `LotControl` pertence ao módulo de estoque/inventário; usado aqui para
   * consolidar recebimentos parciais do mesmo lote).
   *
   * @abstract
   * @param {Object} where - `{ product_id, purchase_id, lot_number }`.
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findLotForReceipt(where: Record<string, unknown>, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.findLotForReceipt não implementado.');
  }

  /**
   * Cria um lote (`LotControl`) para um recebimento de compra (leitura/escrita
   * cross-module pontual — mesmo raciocínio de {@link findLotForReceipt}).
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object>}
   */
  async createLot(data: Record<string, unknown>, transaction: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('PurchaseRepository.createLot não implementado.');
  }
}

export = PurchaseRepository;

