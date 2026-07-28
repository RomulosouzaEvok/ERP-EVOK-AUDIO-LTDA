/**
 * Interface (contrato) do repositório de Ordens de Produção. Documenta os
 * métodos que a implementação de infraestrutura
 * (`SequelizeProductionOrderRepository`) deve fornecer à camada de
 * aplicação. Não contém lógica — apenas assinaturas e docs.
 */
class ProductionOrderRepository {
  /**
   * Lista ordens de produção com filtros e paginação, incluindo os totais
   * de summary (total, planned, in_progress, completed, overdue).
   * @param {Object} filters
   * @returns {Promise<{ rows: Object[], count: number, totals: number[] }>}
   */
  async list(filters) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca uma OP por id, com produto, responsável e criador.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca uma OP "crua" (sem includes), usada para checagens/lock.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findRawById(id) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca uma OP com lock pessimista dentro de uma transação, usada pela
   * máquina de estados para evitar duplo processamento concorrente.
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findByIdForUpdate(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Conta OPs cujo `order_number` começa com o prefixo do ano corrente,
   * usado para gerar o próximo número sequencial.
   * @param {string} yearPrefix
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>}
   */
  async countByOrderNumberPrefix(yearPrefix, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Cria uma nova ordem de produção.
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async create(data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Atualiza campos de uma OP.
   * @param {number} id
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async update(id, data, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Remove uma OP.
   * @param {number} id
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async destroy(id) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca um produto por id (usado para validar existência/tipo/status na criação).
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id, transaction) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Lista OPs para o relatório de produção, em um período opcional.
   * @param {Object} filters
   * @returns {Promise<Object[]>}
   */
  async listForReport(filters) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }
}

module.exports = ProductionOrderRepository;
