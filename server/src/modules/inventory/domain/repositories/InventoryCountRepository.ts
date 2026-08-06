import type { Transaction } from 'sequelize';

/** Filtros de listagem `{ status, count_type }` aceitos por `list`. */
type InventoryCountFilters = Record<string, any>;
/** Paginação `{ limit, offset }` aceita por `list`. */
type InventoryCountPagination = { limit?: number; offset?: number };

/**
 * Interface (contrato) de repositório de Inventário Cíclico
 * (`InventoryCount` + `InventoryCountItem`).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 *
 * A alteração efetiva de `Product.quantity` NUNCA é feita por este
 * repositório — é sempre deanterior a `InventoryService.adjust` pelos use
 * cases de aprovação (ver README do módulo).
 */
class InventoryCountRepository {
  /**
   * Cria uma nova contagem de estoque (cabeçalho), em status `draft`.
   *
   * @abstract
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async create(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.create não implementado.');
  }

  /**
   * Conta contagens cujo `count_number` começa com o prefixo informado
   * (usado para gerar o próximo número sequencial `CC-<ano>-XXXX`).
   *
   * @abstract
   * @param {string} yearPrefix - Ex.: `CC-2026`.
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>}
   */
  async countByCountNumberPrefix(yearPrefix: string, transaction?: Transaction): Promise<number> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.countByCountNumberPrefix não implementado.');
  }

  /**
   * Cria vários itens de contagem de uma vez (bulk insert).
   *
   * @abstract
   * @param {Object[]} items
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object[]>}
   */
  async bulkCreateItems(items: Record<string, unknown>[], transaction?: Transaction): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.bulkCreateItems não implementado.');
  }

  /**
   * Lista contagens de estoque com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, count_type, assigned_to, unassigned }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(filters?: InventoryCountFilters, pagination?: InventoryCountPagination): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.list não implementado.');
  }

  /**
   * Busca uma contagem por id, com seus itens (e produto de cada item).
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.findById não implementado.');
  }

  /**
   * Busca uma contagem "crua" (sem includes), usada internamente para
   * checagens de existência/status antes de transições.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findRawById(id: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.findRawById não implementado.');
  }

  /**
   * Busca uma contagem "crua" com lock pessimista (`SELECT ... FOR UPDATE`),
   * usado para serializar aprovação/rejeição concorrente da mesma contagem.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findRawByIdForUpdate(id: number | string, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.findRawByIdForUpdate não implementado.');
  }

  /**
   * Atualiza campos do cabeçalho da contagem.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async update(id: number | string, data: Record<string, unknown>, transaction?: Transaction): Promise<number> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.update não implementado.');
  }

  /**
   * Atualiza o cabeçalho da contagem apenas se `status` ainda for
   * `expectedStatus` (transição atômica condicionada), retornando o número
   * de linhas afetadas (0 = já foi alterada por outra requisição
   * concorrente).
   *
   * @abstract
   * @param {number} id
   * @param {string} expectedStatus
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction] - Opcional: os use cases de aprovação/rejeição hoje não abrem transação própria (comportamento pré-existente, preservado aqui).
   * @returns {Promise<number>}
   */
  async updateIfStatus(id: number | string, expectedStatus: string, data: Record<string, unknown>, transaction?: Transaction): Promise<number> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.updateIfStatus não implementado.');
  }

  /**
   * Busca um item de contagem por id.
   *
   * @abstract
   * @param {number} itemId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findItemById(itemId: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.findItemById não implementado.');
  }

  /**
   * Lista os itens de uma contagem.
   *
   * @abstract
   * @param {number} inventoryCountId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object[]>}
   */
  async listItems(inventoryCountId: number | string, transaction?: Transaction): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.listItems não implementado.');
  }

  /**
   * Atualiza campos de um item de contagem.
   *
   * @abstract
   * @param {number} itemId
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async updateItem(itemId: number | string, data: Record<string, unknown>, transaction?: Transaction): Promise<number> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.updateItem não implementado.');
  }

  /**
   * Busca um produto por id (usado para fotografar `system_quantity` ao
   * adicionar itens à contagem).
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryCountRepository.findProductById não implementado.');
  }
}

export = InventoryCountRepository;


