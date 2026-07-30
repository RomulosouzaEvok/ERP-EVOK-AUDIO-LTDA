import { Op } from 'sequelize';
import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';
const { ItemEstrutura, Item } = require('../../../../models/index');

/**
 * Implementacao Sequelize do repositorio de estruturas canonicas.
 */
class SequelizeItemEstruturaRepository extends ItemEstruturaRepository {
  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ItemEstrutura.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async findActiveByParentId(itemPaiId: string): Promise<any[]> {
    return ItemEstrutura.findAll({
      where: { item_pai_id: itemPaiId, ativo: true },
      include: [
        { model: Item, as: 'itemComponente' },
      ],
      order: [['sequencia', 'ASC'], ['criado_em', 'ASC']],
    });
  }

  /** @inheritdoc */
  public async listActiveEdges(): Promise<any[]> {
    return ItemEstrutura.findAll({
      where: { ativo: true },
      order: [['item_pai_id', 'ASC'], ['sequencia', 'ASC']],
    });
  }

  /** @inheritdoc */
  public async hasPathBetween(fromItemId: string, toItemId: string): Promise<boolean> {
    const edges = await ItemEstrutura.findAll({
      where: { ativo: true },
      attributes: ['item_pai_id', 'item_componente_id'],
    });

    const childrenByParent = new Map<string, string[]>();
    for (const edge of edges) {
      const parentId = String(edge.item_pai_id);
      const childId = String(edge.item_componente_id);
      const children = childrenByParent.get(parentId) ?? [];
      children.push(childId);
      childrenByParent.set(parentId, children);
    }

    const visited = new Set<string>();
    const stack = [fromItemId];

    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (current === toItemId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const child of childrenByParent.get(current) ?? []) {
        if (!visited.has(child)) {
          stack.push(child);
        }
      }
    }

    return false;
  }

  /** @inheritdoc */
  public async hasActiveParentOrComponent(itemId: string): Promise<boolean> {
    const count = await ItemEstrutura.count({
      where: {
        ativo: true,
        [Op.or]: [
          { item_pai_id: itemId },
          { item_componente_id: itemId },
        ],
      },
    });
    return count > 0;
  }
}

export = SequelizeItemEstruturaRepository;
