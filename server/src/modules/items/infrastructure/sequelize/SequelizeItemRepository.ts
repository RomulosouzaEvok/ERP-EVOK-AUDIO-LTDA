import { Op } from 'sequelize';
import ItemRepository from '../../domain/repositories/ItemRepository';
const { Item } = require('../../../../models/index');
type ItemListOptions = { limit: number; offset: number; search?: string; tipo?: string; status?: string };

/**
 * Implementacao Sequelize do repositorio de itens industriais.
 */
class SequelizeItemRepository extends ItemRepository {
  /** @inheritdoc */
  public async list({ limit, offset, search, tipo, status }: ItemListOptions): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { codigo: { [Op.like]: `%${search}%` } },
        { descricao: { [Op.like]: `%${search}%` } },
      ];
    }
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;

    return Item.findAndCountAll({
      where,
      limit,
      offset,
      order: [['criado_em', 'DESC']],
    });
  }

  /** @inheritdoc */
  public async findById(id: string): Promise<any | null> {
    return Item.findByPk(id);
  }

  /** @inheritdoc */
  public async findByCode(code: string): Promise<any | null> {
    return Item.findOne({ where: { codigo: code } });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return Item.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async update(id: string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const item = await Item.findByPk(id);
    if (!item) return null;
    return item.update(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async listMrpInventoryPositions(itemIds?: string[]): Promise<any[]> {
    const where = itemIds?.length ? { id: { [Op.in]: itemIds } } : undefined;
    return Item.findAll({ where });
  }
}

export = SequelizeItemRepository;
