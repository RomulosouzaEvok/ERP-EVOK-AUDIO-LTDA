/**
 * Interface (contrato) de repositÃ³rio de Produtos.
 */
class ProductRepository {
  async list(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.list nÃ£o implementado.');
  }

  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findById nÃ£o implementado.');
  }

  async findByCode(code) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findByCode nÃ£o implementado.');
  }

  async create(data) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.create nÃ£o implementado.');
  }

  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.update nÃ£o implementado.');
  }

  async countActiveSales(productId) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveSales nÃ£o implementado.');
  }

  async countActiveBomLinks(productId) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveBomLinks nÃ£o implementado.');
  }
}

module.exports = ProductRepository;
