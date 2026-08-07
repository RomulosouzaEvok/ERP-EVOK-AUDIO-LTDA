import type { Request, Response, NextFunction } from 'express';

type MulterFile = { originalname: string; mimetype: string; size: number; buffer?: Buffer };
type RequestWithFile = Request & { file?: MulterFile };

/**
 * Controller HTTP de Aditivos Contratuais (`/api/legal/contract-addendums`).
 *
 * @module modules/legal/presentation/controllers/contractAddendumController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeContractAddendumRepository = require('../../infrastructure/sequelize/SequelizeContractAddendumRepository');
const SequelizeContractRepository = require('../../infrastructure/sequelize/SequelizeContractRepository');
const ListAddendumsUseCase = require('../../application/use-cases/addendum/ListAddendumsUseCase');
const GetAddendumByIdUseCase = require('../../application/use-cases/addendum/GetAddendumByIdUseCase');
const CreateAddendumUseCase = require('../../application/use-cases/addendum/CreateAddendumUseCase');
const UpdateAddendumUseCase = require('../../application/use-cases/addendum/UpdateAddendumUseCase');
const UploadAddendumFileUseCase = require('../../application/use-cases/addendum/UploadAddendumFileUseCase');
const {
  createAddendumSchema, updateAddendumSchema, listAddendumQuerySchema, handleZodError,
} = require('../validators/contractAddendumValidators');
const { ValidationError } = require('../../../../errors');

const addendumRepository = new SequelizeContractAddendumRepository();
const contractRepository = new SequelizeContractRepository();

/** `GET /api/legal/contract-addendums` — lista paginada, com filtro opcional de `contract_id`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listAddendumQuerySchema.parse(req.query);
    const useCase = new ListAddendumsUseCase(addendumRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/legal/contract-addendums/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetAddendumByIdUseCase(addendumRepository);
    const addendum = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: addendum });
  } catch (error) { next(error); }
};

/** `POST /api/legal/contract-addendums` — cria um aditivo (404 se `contract_id` inexistente). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAddendumSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateAddendumUseCase(addendumRepository, contractRepository);
    const addendum = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'LegalContractAddendum',
      entityId: addendum?.id,
      entityDescription: `Aditivo ${addendum?.addendum_number} do contrato ${addendum?.contract_id}`,
      newValues: { contract_id: addendum?.contract_id, addendum_number: addendum?.addendum_number, change_type: addendum?.change_type },
      description: `Aditivo ${addendum?.addendum_number} criado para o contrato ${addendum?.contract_id}`,
    });

    res.status(201).json({ success: true, data: addendum });
  } catch (error) { next(error); }
};

/** `PUT /api/legal/contract-addendums/:id` — atualiza campos do aditivo. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAddendumSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateAddendumUseCase(addendumRepository);
    const addendum = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'LegalContractAddendum',
      entityId: addendum?.id,
      entityDescription: `Aditivo ${addendum?.addendum_number} do contrato ${addendum?.contract_id}`,
      newValues: parsed.data,
      description: `Aditivo ${addendum?.addendum_number} atualizado`,
    });

    res.json({ success: true, data: addendum });
  } catch (error) { next(error); }
};

/** `POST /api/legal/contract-addendums/:id/file` — envia/substitui o arquivo do aditivo. */
exports.uploadFile = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const useCase = new UploadAddendumFileUseCase();
    const addendum = await useCase.execute({
      addendumRepository,
      id: Number(req.params.id),
      file: req.file,
    });

    logAction(req, {
      action: 'update',
      entityType: 'LegalContractAddendum',
      entityId: addendum?.id,
      entityDescription: `Aditivo ${addendum?.addendum_number} do contrato ${addendum?.contract_id}`,
      newValues: { file_path: addendum?.file_path },
      description: `Arquivo do aditivo ${addendum?.addendum_number} enviado`,
    });

    res.json({ success: true, data: addendum });
  } catch (error) { next(error); }
};
