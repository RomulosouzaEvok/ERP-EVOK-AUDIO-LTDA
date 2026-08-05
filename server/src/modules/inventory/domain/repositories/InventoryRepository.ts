import type { Transaction } from 'sequelize';

/**
 * Interface (contrato) de repositório de Estoque (movimentações + relatório
 * + depósitos + lotes + transferências entre depósitos).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/PostgreSQL.
 *
 * A alteração efetiva de `Product.quantity` continua centralizada em
 * `server/src/services/inventoryService.ts` (não duplicada aqui); este
 * repositório cobre leitura/listagem de movimentações, produtos, depósitos
 * (`Warehouse`), saldos por depósito (`ProductWarehouseStock`), lotes
 * (`LotControl`) e transferências entre depósitos (`WarehouseTransfer`).
 */
/** Filtros de listagem (product_id, type, start_date, end_date, warehouse_id) aceitos por `listMovements`. */
type InventoryMovementFilters = Record<string, any>;
/** Paginação `{ limit, offset }` aceita por `listMovements`. */
type InventoryMovementPagination = { limit?: number; offset?: number };
/** Paginação `{ limit, offset }` aceita pelos métodos de lote/saldo por depósito. */
type OffsetPagination = { limit?: number; offset?: number };

class InventoryRepository {
  /**
   * Lista movimentações de estoque com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - Filtros de busca (product_id, type, start_date, end_date, warehouse_id).
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listMovements(filters?: InventoryMovementFilters, pagination?: InventoryMovementPagination): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.listMovements não implementado.');
  }

  /**
   * Busca uma movimentação de estoque pelo id.
   *
   * @abstract
   * @param {number} id - Id da movimentação.
   * @returns {Promise<Object|null>} Registro encontrado ou `null`.
   */
  async findMovementById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findMovementById não implementado.');
  }

  /**
   * Lista produtos ativos com sua categoria (usado no relatório de estoque).
   *
   * @abstract
   * @returns {Promise<Object[]>}
   */
  async listActiveProductsWithCategory(): Promise<any[]> {
    throw new Error('InventoryRepository.listActiveProductsWithCategory não implementado.');
  }

  /**
   * Lista produtos ativos com estoque igual ou abaixo do mínimo (`quantity <= min_quantity`).
   *
   * @abstract
   * @returns {Promise<Object[]>}
   */
  async listLowStockProducts(): Promise<any[]> {
    throw new Error('InventoryRepository.listLowStockProducts não implementado.');
  }

  /**
   * Busca um produto (`Product`, legado) pelo id, sem includes.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findProductById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findProductById não implementado.');
  }

  /**
   * Cria uma movimentação de estoque (`InventoryMovement`) diretamente,
   * usado pela aprovação de transferência entre depósitos (débito/crédito
   * atômico, `type='transfer'`).
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createInventoryMovement(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.createInventoryMovement não implementado.');
  }

  /**
   * Busca um depósito (`Warehouse`) pelo `code` exato.
   *
   * @abstract
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findWarehouseByCode(code: string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findWarehouseByCode não implementado.');
  }

  /**
   * Busca um depósito (`Warehouse`) pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findWarehouseById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findWarehouseById não implementado.');
  }

  /**
   * Lista depósitos ativos, ordenados por `code`.
   *
   * @abstract
   * @returns {Promise<Object[]>}
   */
  async listActiveWarehouses(): Promise<any[]> {
    throw new Error('InventoryRepository.listActiveWarehouses não implementado.');
  }

  /**
   * Cria um novo depósito (`Warehouse`).
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createWarehouse(data: Record<string, unknown>): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.createWarehouse não implementado.');
  }

  /**
   * Busca uma transferência entre depósitos (`WarehouseTransfer`) pelo id,
   * com lock pessimista (`SELECT ... FOR UPDATE`), usado por
   * aprovação/rejeição.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findWarehouseTransferForUpdate(id: number | string, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findWarehouseTransferForUpdate não implementado.');
  }

  /**
   * Cria uma solicitação de transferência entre depósitos (`status='pending'`).
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createWarehouseTransfer(data: Record<string, unknown>): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.createWarehouseTransfer não implementado.');
  }

  /**
   * Lista transferências entre depósitos com filtro opcional de `status`,
   * incluindo `product`, `fromWarehouse`, `toWarehouse`, `requestedBy` e
   * `approvedBy`.
   *
   * @abstract
   * @param {Object} [where]
   * @returns {Promise<Object[]>}
   */
  async listWarehouseTransfers(where?: Record<string, unknown>): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.listWarehouseTransfers não implementado.');
  }

  /**
   * Lista saldos por par produto×depósito (`ProductWarehouseStock`), com
   * `product` e `warehouse` incluídos.
   *
   * @abstract
   * @param {Object} [where] - Filtro sobre `ProductWarehouseStock` (ex.: `product_id`).
   * @param {Object} [warehouseWhere] - Filtro sobre o `Warehouse` incluído (ex.: `code`).
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listWarehouseStock(
    where?: Record<string, unknown>, // eslint-disable-line no-unused-vars
    warehouseWhere?: Record<string, unknown>, // eslint-disable-line no-unused-vars
    pagination?: OffsetPagination // eslint-disable-line no-unused-vars
  ): Promise<{ rows: any[]; count: number }> {
    throw new Error('InventoryRepository.listWarehouseStock não implementado.');
  }

  /**
   * Busca um lote (`LotControl`) pelo id, sem includes.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findLotById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findLotById não implementado.');
  }

  /**
   * Busca um único lote pelo `lot_number` (+ filtro opcional já embutido em
   * `where`, ex.: `product_id`), com `product`, `supplier` e `warehouse`
   * incluídos, ordenado por `createdAt ASC`. Usado quando `product_id` é
   * informado para desambiguar.
   *
   * @abstract
   * @param {Object} where
   * @returns {Promise<Object|null>}
   */
  async findLotByCodeForProduct(where: Record<string, unknown>): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findLotByCodeForProduct não implementado.');
  }

  /**
   * Busca até 2 lotes pelo `lot_number` (sem filtro de produto), com
   * `product`, `supplier` e `warehouse` incluídos, ordenado por
   * `createdAt ASC`. Usado para detectar ambiguidade (mesmo código em mais
   * de um produto).
   *
   * @abstract
   * @param {Object} where
   * @returns {Promise<Object[]>}
   */
  async findLotsByCode(where: Record<string, unknown>): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findLotsByCode não implementado.');
  }

  /**
   * Lista lotes (`LotControl`) com filtros e paginação, incluindo `product`
   * e `supplier`, ordenado por `createdAt ASC`.
   *
   * @abstract
   * @param {Object} [where]
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listLots(where?: Record<string, unknown>, pagination?: OffsetPagination): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.listLots não implementado.');
  }
}

export = InventoryRepository;

