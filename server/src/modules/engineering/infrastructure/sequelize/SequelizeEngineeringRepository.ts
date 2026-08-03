/**
 * Implementacao Sequelize/PostgreSQL do {@link EngineeringRepository}.
 *
 * @module modules/engineering/infrastructure/sequelize/SequelizeEngineeringRepository
 */

const EngineeringRepository = require('../../domain/repositories/EngineeringRepository');
const {
  EngineeringProject,
  ProductDrawing,
  Item,
  ItemEspecificacaoTecnica,
  Product,
  User,
} = require('../../../../models/index');

class SequelizeEngineeringRepository extends EngineeringRepository {
  // ---------------------------------------------------------------------
  // Projetos de Engenharia (P&D)
  // ---------------------------------------------------------------------

  async listProjects(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.stage) where.stage = filters.stage;

    const { count, rows } = await EngineeringProject.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'projectManager', attributes: ['id', 'name'] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return { rows, count };
  }

  async findProjectById(id: number) {
    return EngineeringProject.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'projectManager', attributes: ['id', 'name'] },
      ],
    });
  }

  async findProjectByCode(projectCode: string) {
    return EngineeringProject.findOne({ where: { project_code: projectCode } });
  }

  async createProject(data: Record<string, unknown>) {
    return EngineeringProject.create(data);
  }

  async updateProject(id: number, data: Record<string, unknown>) {
    const project = await EngineeringProject.findByPk(id);
    if (!project) return null;
    await project.update(data);
    return this.findProjectById(id);
  }

  // ---------------------------------------------------------------------
  // Desenhos Tecnicos
  // ---------------------------------------------------------------------

  async listDrawings(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.status) where.status = filters.status;

    const { count, rows } = await ProductDrawing.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return { rows, count };
  }

  async findDrawingById(id: number) {
    return ProductDrawing.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
      ],
    });
  }

  async findDrawingByNumberAndRevision(drawingNumber: string, revision: string) {
    return ProductDrawing.findOne({ where: { drawing_number: drawingNumber, revision } });
  }

  async createDrawing(data: Record<string, unknown>) {
    return ProductDrawing.create(data);
  }

  async updateDrawing(id: number, data: Record<string, unknown>) {
    const drawing = await ProductDrawing.findByPk(id);
    if (!drawing) return null;
    await drawing.update(data);
    return this.findDrawingById(id);
  }

  // ---------------------------------------------------------------------
  // Ficha Tecnica (ItemEspecificacaoTecnica)
  // ---------------------------------------------------------------------

  async findItemById(itemId: string) {
    return Item.findByPk(itemId);
  }

  async findTechnicalSpecByItemId(itemId: string) {
    return ItemEspecificacaoTecnica.findByPk(itemId);
  }

  async upsertTechnicalSpec(itemId: string, data: Record<string, any>) {
    const existing = await ItemEspecificacaoTecnica.findByPk(itemId);
    if (existing) {
      await existing.update(data);
      return this.findTechnicalSpecByItemId(itemId);
    }
    return ItemEspecificacaoTecnica.create({ item_id: itemId, ...data });
  }
}

export = SequelizeEngineeringRepository;
