/**
 * Controller HTTP do modulo de Engenharia (Projetos P&D, Desenhos Tecnicos
 * e Ficha Tecnica Thiele-Small de Itens).
 *
 * @module modules/engineering/presentation/controllers/engineeringController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeEngineeringRepository = require('../../infrastructure/sequelize/SequelizeEngineeringRepository');

const ListProjectsUseCase = require('../../application/use-cases/ListProjectsUseCase');
const GetProjectByIdUseCase = require('../../application/use-cases/GetProjectByIdUseCase');
const CreateProjectUseCase = require('../../application/use-cases/CreateProjectUseCase');
const UpdateProjectUseCase = require('../../application/use-cases/UpdateProjectUseCase');

const ListDrawingsUseCase = require('../../application/use-cases/ListDrawingsUseCase');
const CreateDrawingUseCase = require('../../application/use-cases/CreateDrawingUseCase');
const UpdateDrawingUseCase = require('../../application/use-cases/UpdateDrawingUseCase');
const ReleaseDrawingUseCase = require('../../application/use-cases/ReleaseDrawingUseCase');
const ObsoleteDrawingUseCase = require('../../application/use-cases/ObsoleteDrawingUseCase');

const GetTechnicalSpecUseCase = require('../../application/use-cases/GetTechnicalSpecUseCase');
const UpsertTechnicalSpecUseCase = require('../../application/use-cases/UpsertTechnicalSpecUseCase');

const {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  createDrawingSchema,
  updateDrawingSchema,
  listDrawingsQuerySchema,
  upsertTechnicalSpecSchema,
  handleZodError,
} = require('../validators/engineeringValidators');
const { ValidationError } = require('../../../../errors');

const engineeringRepository = new SequelizeEngineeringRepository();

// -------------------------------------------------------------------------
// Projetos de Engenharia (P&D)
// -------------------------------------------------------------------------

/** `GET /api/engineering/projects` — lista paginada de projetos de P&D. */
exports.listProjects = async (req: any, res: any, next: any) => {
  try {
    const query = listProjectsQuerySchema.parse(req.query);
    const useCase = new ListProjectsUseCase(engineeringRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/** `GET /api/engineering/projects/:id` — busca um projeto de P&D por id. */
exports.getProjectById = async (req: any, res: any, next: any) => {
  try {
    const useCase = new GetProjectByIdUseCase(engineeringRepository);
    const project = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/engineering/projects` — cria um projeto de P&D (409 se `project_code` duplicado). */
exports.createProject = async (req: any, res: any, next: any) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateProjectUseCase(engineeringRepository);
    const project = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'EngineeringProject',
      entityId: project?.id,
      entityDescription: project?.project_code,
      newValues: { project_code: project?.project_code, name: project?.name },
      description: `Projeto de engenharia ${project?.project_code} criado`,
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/engineering/projects/:id` — atualiza campos de um projeto de P&D. */
exports.updateProject = async (req: any, res: any, next: any) => {
  try {
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateProjectUseCase(engineeringRepository);
    const project = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'EngineeringProject',
      entityId: project?.id,
      entityDescription: project?.project_code,
      newValues: parsed.data,
      description: `Projeto de engenharia ${project?.project_code} atualizado`,
    });

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------------
// Desenhos Tecnicos
// -------------------------------------------------------------------------

/** `GET /api/engineering/drawings` — lista paginada de desenhos tecnicos. */
exports.listDrawings = async (req: any, res: any, next: any) => {
  try {
    const query = listDrawingsQuerySchema.parse(req.query);
    const useCase = new ListDrawingsUseCase(engineeringRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/** `POST /api/engineering/drawings` — cria um desenho tecnico (409 se numero+revisao duplicados). */
exports.createDrawing = async (req: any, res: any, next: any) => {
  try {
    const parsed = createDrawingSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateDrawingUseCase(engineeringRepository);
    const drawing = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'ProductDrawing',
      entityId: drawing?.id,
      entityDescription: `${drawing?.drawing_number} rev.${drawing?.revision}`,
      newValues: { drawing_number: drawing?.drawing_number, revision: drawing?.revision },
      description: `Desenho tecnico ${drawing?.drawing_number} rev.${drawing?.revision} criado`,
    });

    res.status(201).json({ success: true, data: drawing });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/engineering/drawings/:id` — atualiza campos de um desenho tecnico. */
exports.updateDrawing = async (req: any, res: any, next: any) => {
  try {
    const parsed = updateDrawingSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateDrawingUseCase(engineeringRepository);
    const drawing = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'ProductDrawing',
      entityId: drawing?.id,
      entityDescription: `${drawing?.drawing_number} rev.${drawing?.revision}`,
      newValues: parsed.data,
      description: `Desenho tecnico ${drawing?.drawing_number} rev.${drawing?.revision} atualizado`,
    });

    res.json({ success: true, data: drawing });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/engineering/drawings/:id/release` — libera desenho (draft -> released). */
exports.releaseDrawing = async (req: any, res: any, next: any) => {
  try {
    const useCase = new ReleaseDrawingUseCase(engineeringRepository);
    const drawing = await useCase.execute({ id: Number(req.params.id), approvedBy: req.user.id });

    logAction(req, {
      action: 'release',
      entityType: 'ProductDrawing',
      entityId: drawing?.id,
      entityDescription: `${drawing?.drawing_number} rev.${drawing?.revision}`,
      newValues: { status: 'released', approved_by: req.user.id },
      description: `Desenho tecnico ${drawing?.drawing_number} rev.${drawing?.revision} liberado`,
    });

    res.json({ success: true, data: drawing });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/engineering/drawings/:id/obsolete` — torna desenho obsoleto (released -> obsolete). */
exports.obsoleteDrawing = async (req: any, res: any, next: any) => {
  try {
    const useCase = new ObsoleteDrawingUseCase(engineeringRepository);
    const drawing = await useCase.execute({ id: Number(req.params.id) });

    logAction(req, {
      action: 'obsolete',
      entityType: 'ProductDrawing',
      entityId: drawing?.id,
      entityDescription: `${drawing?.drawing_number} rev.${drawing?.revision}`,
      newValues: { status: 'obsolete' },
      description: `Desenho tecnico ${drawing?.drawing_number} rev.${drawing?.revision} tornado obsoleto`,
    });

    res.json({ success: true, data: drawing });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------------
// Ficha Tecnica Thiele-Small (ItemEspecificacaoTecnica)
// -------------------------------------------------------------------------

/** `GET /api/engineering/items/:itemId/technical-spec` — busca a ficha tecnica de um item (404 se item nao existe). */
exports.getTechnicalSpec = async (req: any, res: any, next: any) => {
  try {
    const useCase = new GetTechnicalSpecUseCase(engineeringRepository);
    const spec = await useCase.execute({ itemId: req.params.itemId });
    res.json({ success: true, data: spec });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/engineering/items/:itemId/technical-spec` — upsert da ficha tecnica de um item. */
exports.upsertTechnicalSpec = async (req: any, res: any, next: any) => {
  try {
    const parsed = upsertTechnicalSpecSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpsertTechnicalSpecUseCase(engineeringRepository);
    const spec = await useCase.execute({ itemId: req.params.itemId, ...parsed.data });

    logAction(req, {
      action: 'upsert',
      entityType: 'ItemEspecificacaoTecnica',
      entityId: undefined,
      entityDescription: req.params.itemId,
      newValues: parsed.data,
      description: `Ficha tecnica do item ${req.params.itemId} atualizada`,
    });

    res.json({ success: true, data: spec });
  } catch (error) {
    next(error);
  }
};
