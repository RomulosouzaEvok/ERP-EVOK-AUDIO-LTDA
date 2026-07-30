/**
 * Implementacao Sequelize do repositorio de Fornecedores.
 *
 * @module modules/suppliers/infrastructure/sequelize/SequelizeSuppliersRepository
 */

import { Op } from 'sequelize';
import SuppliersRepository from '../../domain/repositories/SuppliersRepository';
const { Supplier, Purchase }: any = require('../../../../models/index');
const Validators = require('../../../../utils/validators');
type SuppliersListOptions = { limit: number; offset: number; search?: string; status?: string };

class SequelizeSuppliersRepository extends SuppliersRepository {
  /** @inheritdoc */
  public async list({ limit, offset, search, status }: SuppliersListOptions): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { company_name: { [Op.like]: `%${sanitized}%` } },
        { cnpj: { [Op.like]: `%${sanitized}%` } }
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
