/**
 * Interface (contrato) de repositório de Produtos.
 */
class ProductRepository {
  async list(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.list não implementado.');
  }

  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findById não implementado.');
  }

  async findByCode(code) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findByCode não implementado.');
  }

  async create(data) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.create não implementado.');
  }

  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.update não implementado.');
  }

  async countActiveSales(productId) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveSales não implementado.');
  }

  async countActiveBomLinks(productId) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveBomLinks não implementado.');
  }
}

module.exports = ProductRepository;

