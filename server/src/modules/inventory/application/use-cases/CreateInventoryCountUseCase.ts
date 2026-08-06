import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

const InventoryCountEntity = require('../../domain/entities/InventoryCountEntity');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');

const itemRepository = new SequelizeItemRepository();

/** Dados de entrada de `CreateInventoryCountUseCase.execute`. */
interface CreateInventoryCountInput {
  count_type?: 'cycle' | 'full' | 'spot';
  /** Depósito ao qual TODA a contagem pertence (obrigatório). */
  warehouse_id: number;
  location?: string;
  notes?: string;
  /** Produtos a incluir desde já na contagem (legado, opcional). */
  product_ids?: number[];
  /** Itens a incluir desde já na contagem (novo, PREFERIDO, opcional). */
  item_ids?: string[];
  /** Id do usuário que está criando a contagem. */
  created_by: number;
  /**
   * Id do funcionário responsável pela contagem (opcional). Ausente/`null`
   * = contagem fica disponível no "pool" (qualquer funcionário autorizado
   * pode "pegá-la" via `POST /:id/start`).
   */
  assigned_to?: number | null;
  /**
   * FK -> departments.id (opcional). Departamento dono da contagem, usado
   * pelo painel de TV de demandas por departamento (migration
   * 20260806-000003). Ausente/`null` = "Sem departamento" no painel.
   */
  department_id?: number | null;
}

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
 *
 * Validação de `assigned_to` (achado de auditoria 2026-08-06, item 2):
 * quando informado, o usuário-alvo precisa existir e estar ATIVO
 * (`users.active = true`) — caso contrário, `BusinessRuleError` (422) com
 * `details` didático (regra de negócio, não de forma/shape do payload —
 * por isso `BusinessRuleError`, não `ValidationError`/400). Não valida
 * perfil de acesso do usuário-alvo (ver JSDoc de
 * `InventoryCountRepository.findActiveUserById` para a decisão).
 */
class CreateInventoryCountUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
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
   * @param {number} [input.assigned_to] - Id do funcionário responsável pela contagem (opcional; ausente = pool).
   * @param {number} [input.department_id] - Id do departamento dono da contagem (opcional; usado pelo painel de TV).
   * @returns {Promise<{ count: Object, items: Object[] }>}
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos (inclusive `warehouse_id` ausente).
   * @throws {BusinessRuleError} Se `assigned_to` for informado e não corresponder a um usuário ativo (422).
   * @throws {NotFoundError} Se algum id em `product_ids` ou `item_ids` não corresponder a um item/produto existente.
   */
  async execute({ count_type, warehouse_id, location, notes, product_ids, item_ids, created_by, assigned_to, department_id }: CreateInventoryCountInput) {
    const entity = new InventoryCountEntity({ count_type, warehouse_id, location, notes, created_by, assigned_to, department_id });

    const t = await sequelize.transaction();
    try {
      if (entity.assigned_to !== null) {
        // Achado de auditoria 2026-08-06 (item 2): `assigned_to` precisa
        // apontar para um usuário que existe e está ativo — caso contrário
        // a contagem nasceria "presa" para sempre a um funcionário
        // desligado/inexistente (mesma classe de problema do achado 1).
        const assignedUser = await this.inventoryCountRepository.findActiveUserById(entity.assigned_to, t);
        if (!assignedUser) {
          throw new BusinessRuleError(
            `Usuário responsável (assigned_to=${entity.assigned_to}) não encontrado ou inativo. Verifique o id informado.`,
            { field: 'assigned_to', value: entity.assigned_to }
          );
        }
      }

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
          // DUAL-READ: item_ids referenciam o Item novo (chave UUID); o
          // saldo/estoque ainda vive no Product legado (crosswalk por
          // `codigo`, mesmo padrão de `CreateInventoryMovementUseCase`).
          // Chamar `findProductById(id)` direto com um UUID de Item nunca
          // batia no Product (chave INTEGER) — toda contagem criada via
          // `item_ids` falhava com 404, ainda que a UI/API já aceitassem
          // esse caminho como "preferido".
          const product = isItemIds
            ? await itemRepository.findLegacyProductByItemId(id)
            : await this.inventoryCountRepository.findProductById(id, t);
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


