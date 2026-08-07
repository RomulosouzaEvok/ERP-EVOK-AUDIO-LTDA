import type { Request, Response, NextFunction } from 'express';

/**
 * Arquivo de upload processado pelo Multer (memória). Definido localmente
 * pelo mesmo motivo de `assetController.ts`/`materialController.ts`:
 * `@types/multer` não faz merge com `@types/express` nesta versão do projeto.
 */
type MulterFile = { originalname: string; mimetype: string; size: number; buffer?: Buffer };
type RequestWithFile = Request & { file?: MulterFile };

/**
 * Controller HTTP de Contratos (`/api/legal/contracts`).
 *
 * @module modules/legal/presentation/controllers/contractController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeContractRepository = require('../../infrastructure/sequelize/SequelizeContractRepository');
const ListContractsUseCase = require('../../application/use-cases/contract/ListContractsUseCase');
const GetContractByIdUseCase = require('../../application/use-cases/contract/GetContractByIdUseCase');
const CreateContractUseCase = require('../../application/use-cases/contract/CreateContractUseCase');
const UpdateContractUseCase = require('../../application/use-cases/contract/UpdateContractUseCase');
const UploadContractFileUseCase = require('../../application/use-cases/contract/UploadContractFileUseCase');
const ListExpiringContractsUseCase = require('../../application/use-cases/contract/ListExpiringContractsUseCase');
const {
  createContractSchema, updateContractSchema, listContractQuerySchema, expiringContractQuerySchema, handleZodError,
} = require('../validators/contractValidators');
const { ValidationError } = require('../../../../errors');

const contractRepository = new SequelizeContractRepository();

/** `GET /api/legal/contracts` — lista paginada, com filtros opcionais de `status`/`contract_type`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listContractQuerySchema.parse(req.query);
    const useCase = new ListContractsUseCase(contractRepository);
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

/**
 * `GET /api/legal/contracts/expiring` — contratos com vencimento próximo
 * (ou já vencido, ainda não `terminated`), filtro `days` (default 30). Caso
 * de uso central do spec de Contratos (gestão de prazos).
 */
exports.listExpiring = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = expiringContractQuerySchema.parse(req.query);
    const useCase = new ListExpiringContractsUseCase(contractRepository);
    const contracts = await useCase.execute(query);
    res.json({ success: true, data: contracts });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/legal/contracts/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetContractByIdUseCase(contractRepository);
    const contract = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `POST /api/legal/contracts` — cria um contrato (409 se `contract_number` duplicado). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createContractSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateContractUseCase(contractRepository);
    const contract = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'LegalContract',
      entityId: contract?.id,
      entityDescription: contract?.contract_number,
      newValues: { contract_number: contract?.contract_number, title: contract?.title, contract_type: contract?.contract_type },
      description: `Contrato ${contract?.contract_number} criado`,
    });

    res.status(201).json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `PUT /api/legal/contracts/:id` — atualiza campos do contrato. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateContractSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateContractUseCase(contractRepository);
    const contract = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'LegalContract',
      entityId: contract?.id,
      entityDescription: contract?.contract_number,
      newValues: parsed.data,
      description: `Contrato ${contract?.contract_number} atualizado`,
    });

    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `POST /api/legal/contracts/:id/file` — envia/substitui o arquivo (instrumento) do contrato. */
exports.uploadFile = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const useCase = new UploadContractFileUseCase();
    const contract = await useCase.execute({
      contractRepository,
      id: Number(req.params.id),
      file: req.file,
    });

    logAction(req, {
      action: 'update',
      entityType: 'LegalContract',
      entityId: contract?.id,
      entityDescription: contract?.contract_number,
      newValues: { file_path: contract?.file_path },
      description: `Arquivo do contrato ${contract?.contract_number} enviado`,
    });

    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};
