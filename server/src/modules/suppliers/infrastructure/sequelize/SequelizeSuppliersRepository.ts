/**
 * Implementacao Sequelize do repositorio de Fornecedores.
 *
 * @module modules/suppliers/infrastructure/sequelize/SequelizeSuppliersRepository
 */

import { Op } from 'sequelize';
import SuppliersRepository, { SuppliersListOptions } from '../../domain/repositories/SuppliersRepository';
const { Supplier, Purchase }: any = require('../../../../models/index');

class SequelizeSuppliersRepository extends SuppliersRepository {
  /** @inheritdoc */
  public async list({ limit, offset, search, status }: SuppliersListOptions): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;

    return Supplier.findAndCountAll({
      where,
      limit,
      offset,
      order: [['company_name', 'ASC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number): Promise<any | null> {
    return Supplier.findByPk(id);
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return Supplier.create(data);
  }

  /** @inheritdoc */
  public async update(id: number, data: Record<string, unknown>): Promise<number> {
    const [updated] = await Supplier.update(data, { where: { id } });
    return updated;
  }

  /** @inheritdoc */
  public async countPendingPurchases(supplierId: number): Promise<number> {
    return Purchase.count({
      where: {
        supplier_id: supplierId,
        status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] }
      }
    });
  }
}

export = SequelizeSuppliersRepository;
