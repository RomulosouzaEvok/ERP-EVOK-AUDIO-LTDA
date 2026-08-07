/**
 * Implementação Sequelize/PostgreSQL do {@link MaterialRepository}.
 *
 * @module modules/marketing/infrastructure/sequelize/SequelizeMaterialRepository
 */

const MaterialRepository = require('../../domain/repositories/MaterialRepository');
const { MarketingMaterial, Item } = require('../../../../models/index');

class SequelizeMaterialRepository extends MaterialRepository {
  async listMaterials(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.material_type) where.material_type = filters.material_type;
    if (filters.product_id) where.product_id = filters.product_id;
    if (typeof filters.approved === 'boolean') where.approved = filters.approved;

    const { count, rows } = await MarketingMaterial.findAndCountAll({
      where,
      include: [{ model: Item, as: 'product', attributes: ['id', 'codigo', 'descricao'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });

    return { rows, count };
  }

  async findMaterialById(id: number) {
    return MarketingMaterial.findByPk(id, {
      include: [{ model: Item, as: 'product', attributes: ['id', 'codigo', 'descricao'] }],
    });
  }

  async createMaterial(data: Record<string, unknown>) {
    const created = await MarketingMaterial.create(data);
    return this.findMaterialById(created.id);
  }

  async updateMaterial(id: number, data: Record<string, unknown>) {
    const material = await MarketingMaterial.findByPk(id);
    if (!material) return null;
    await material.update(data);
    return this.findMaterialById(id);
  }
}

export = SequelizeMaterialRepository;
