/**
 * Interface (contrato) do repositório de BOM. Documenta os métodos que a
 * implementação de infraestrutura (`SequelizeBOMRepository`) deve fornecer
 * à camada de aplicação. Não contém lógica — apenas assinaturas e docs.
 */
class BOMRepository {
  /**
   * Lista BOMs com filtros e paginação.
   * @param {Object} filters
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(filters) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca uma BOM por id, com produto e itens.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca a BOM ativa de um produto.
   * @param {number} productId
   * @returns {Promise<Object|null>}
   */
  async findActiveByProduct(productId) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Lista todas as versões (qualquer status) de BOM de um produto.
   * @param {number} productId
   * @returns {Promise<Object[]>}
   */
  async listVersionsByProduct(productId) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Atualiza campos gerais de uma BOM.
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Lista itens de uma BOM.
   * @param {number} bomId
   * @returns {Promise<Object[]>}
   */
  async listItems(bomId) { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }
}

module.exports = BOMRepository;
