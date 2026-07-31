/**
 * Implementacao Sequelize do repositorio de Inventário Mobile.
 *
 * @module modules/mobileInventory/infrastructure/sequelize/SequelizeMobileInventoryRepository
 */

import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';
const { InventoryMovement, Product, User }: any = require('../../../../models/index');
const { Op }: any = require('sequelize');

class SequelizeMobileInventoryRepository extends MobileInventoryRepository {
  /** @inheritdoc */
  public async findProductByCode(code: string): Promise<any | null> {
    return Product.findOne({
      where: { [Op.or]: [{ code }, { id: isNaN(code as any) ? undefined : code }] }
    });
  }

  /** @inheritdoc */
  public async listMovements(pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    return InventoryMovement.findAndCountAll({
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'user', attributes: ['id', 'name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });
  }
}

export = SequelizeMobileInventoryRepository;
