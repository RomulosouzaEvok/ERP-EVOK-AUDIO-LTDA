const UseCase = require('../../../../shared/application/UseCase');
const InventoryCountEntity = require('../../domain/entities/InventoryCountEntity');
const { NotFoundError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');

/**
 * Cria uma nova contagem de inventário cíclico (cabeçalho em status
 * `draft`), cobrindo `POST /api/inventory-counts`.
 *
 * DUAL-READ: Aceita `product_ids` (legado) OU `item_ids` (novo, PREFERIDO).
 *
 * `InventoryCountEntity` valida a FORMA dos dados de entrada (`count_type`,
 * `warehouse_id`, `created_by`). Este use case gera o número sequencial
 * `CC-<ano>-XXXX` e, quando uma lista de `product_ids` ou `item_ids` é
 * informada, já cria os itens da contagem "fotografando" a quantidade de
 * sistema (`system_quantity`) de cada produto/item no momento da criação —
 * tudo dentro de uma única transação.
 *
 * Bloco 4 (multiplos depositos, migration `20260804-000006`): `warehouse_id`
 * é OBRIGATÓRIO no payload de criação (a contagem inteira é escopada a um
 * único depósito — `inventory_count_items` herda o depósito do cabeçalho,
 * não tem coluna própria). `InventoryCountEntity.validate()` lança
 * `ValidationError` (400) se ausente.
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
   * @param {number} input.warehouse_id - Depósito ao qual TODA a contagem pertence (obrigatório).
   * @param {string} [input.location]
   * @param {string} [input.notes]
   * @param {number[]} [input.product_ids] - Produtos a incluir desde já na contagem (legado, opcional).
   * @param {string[]} [input.item_ids] - Itens a incluir desde já na contagem (novo, PREFERIDO, opcional).
   * @param {number} input.created_by - Id do usuário que está criando a contagem.
   * @returns {Promise<{ count: Object, items: Object[] }>}
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos (inclusive `warehouse_id` ausente).
   * @throws {NotFoundError} Se algum id em `product_ids` ou `item_ids` não corresponder a um item/produto existente.
   */
  async execute({ count_type, warehouse_id, location, notes, product_ids, item_ids, created_by }) {
    const entity = new InventoryCountEntity({ count_type, warehouse_id, location, notes, created_by });

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
      // DUAL-READ: aceitar ambos product_ids (legado) e item_ids (novo), preferir item_ids
      const idsToProcess = (Array.isArray(item_ids) && item_ids.length > 0) ? item_ids : product_ids;
      const isItemIds = (Array.isArray(item_ids) && item_ids.length > 0);

      if (Array.isArray(idsToProcess) && idsToProcess.length > 0) {
        const itemsData = [];
        for (const id of idsToProcess) {
          const product = await this.inventoryCountRepository.findProductById(id, t);
          if (!product) {
            const idType = isItemIds ? 'Item' : 'Produto';
            throw new NotFoundError(`${idType} ID ${id} não encontrado`);
          }
          itemsData.push({
            inventory_count_id: count.id,
            product_id: isItemIds ? null : id,
            item_id: isItemIds ? id : null,
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


