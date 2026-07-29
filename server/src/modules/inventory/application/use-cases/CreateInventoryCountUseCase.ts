const UseCase = require('../../../../shared/application/UseCase');
const InventoryCountEntity = require('../../domain/entities/InventoryCountEntity');
const { NotFoundError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');

/**
 * Cria uma nova contagem de inventário cíclico (cabeçalho em status
 * `draft`), cobrindo `POST /api/inventory-counts`.
 *
 * `InventoryCountEntity` valida a FORMA dos dados de entrada (`count_type`,
 * `created_by`). Este use case gera o número sequencial `CC-<ano>-XXXX` e,
 * quando uma lista de `product_ids` é informada, já cria os itens da
 * contagem "fotografando" a quantidade de sistema (`system_quantity`) de
 * cada produto no momento da criação — tudo dentro de uma única transação.
 */
class CreateInventoryCountUseCase extends UseCase {
  /** @param {import('../../domain/repositories/InventoryCountRepository')} inventoryCountRepository */
  constructor(inventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {'cycle'|'full'|'spot'} [input.count_type]
   * @param {string} [input.location]
   * @param {string} [input.notes]
   * @param {number[]} [input.product_ids] - Produtos a incluir desde já na contagem (opcional).
   * @param {number} input.created_by - Id do usuário que está criando a contagem.
   * @returns {Promise<{ count: Object, items: Object[] }>}
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {NotFoundError} Se algum id em `product_ids` não corresponder a um produto existente.
   */
  async execute({ count_type, location, notes, product_ids, created_by }) {
    const entity = new InventoryCountEntity({ count_type, location, notes, created_by });

    const t = await sequelize.transaction();
    try {
      const year = new Date().getFullYear();
      const yearPrefix = `CC-${year}`;
      const existing = await this.inventoryCountRepository.countByCountNumberPrefix(yearPrefix, t);
      const count_number = `${yearPrefix}-${String(existing + 1).padStart(4, '0')}`;

      const count = await this.inventoryCountRepository.create({
        ...entity.toRepositoryInput(),
        count_number
      }, t);

      let items = [];
      if (Array.isArray(product_ids) && product_ids.length > 0) {
        const itemsData = [];
        for (const productId of product_ids) {
          const product = await this.inventoryCountRepository.findProductById(productId, t);
          if (!product) {
            throw new NotFoundError(`Produto ID ${productId} não encontrado`);
          }
          itemsData.push({
            inventory_count_id: count.id,
            product_id: productId,
            system_quantity: product.quantity,
            status: 'pending'
          });
        }
        items = await this.inventoryCountRepository.bulkCreateItems(itemsData, t);
      }

      await t.commit();
      return { count, items };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = CreateInventoryCountUseCase;


