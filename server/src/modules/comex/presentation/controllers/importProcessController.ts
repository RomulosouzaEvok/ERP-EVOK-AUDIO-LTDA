import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
import SequelizeComexRepository = require('../../infrastructure/sequelize/SequelizeComexRepository');
import SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
import CreateImportProcessUseCase = require('../../application/use-cases/CreateImportProcessUseCase');
import ListImportProcessesUseCase = require('../../application/use-cases/ListImportProcessesUseCase');
import GetImportProcessByIdUseCase = require('../../application/use-cases/GetImportProcessByIdUseCase');
import RegisterImportTrackingUseCase = require('../../application/use-cases/RegisterImportTrackingUseCase');
import CancelImportProcessUseCase = require('../../application/use-cases/CancelImportProcessUseCase');
import ReceiveImportProcessUseCase = require('../../application/use-cases/ReceiveImportProcessUseCase');
import ApproveImportProcessUseCase = require('../../application/use-cases/ApproveImportProcessUseCase');
import ListImportProcessApprovalsUseCase = require('../../application/use-cases/ListImportProcessApprovalsUseCase');
const {
  createImportProcessSchema,
  listImportProcessQuerySchema,
  registerImportTrackingSchema,
  cancelImportProcessSchema,
  handleZodError,
} = require('../validators/importProcessValidators');
const { ValidationError } = require('../../../../errors');

const comexRepository = new SequelizeComexRepository();
const itemRepository = new SequelizeItemRepository();

/**
 * Requisicao autenticada: `req.user` e populado pelo middleware
 * `authenticate` (mesmo padrao de `rfqController.ts`). `permissions` e o
 * mapa de modulos de acesso do perfil, usado pelo G11-COMEX para resolver o
 * papel de aprovador (ver {@link resolveAvailableApproverRoles}).
 */
type AuthenticatedRequest = Request & {
  user: {
    id: number;
    role: 'admin' | 'operator' | 'financial';
    permissions?: Record<string, string | undefined>;
  };
};

/**
 * G11-COMEX — resolve os papeis de aprovador de alcada que o usuario logado
 * efetivamente possui, a partir do RBAC real (`req.user.permissions`),
 * NUNCA do body. Copia fiel do padrao anti-spoofing ja aprovado no G11
 * (`purchaseController.resolveAvailableApproverRoles`) e no Juridico
 * (RF-JUR-003). `role === 'admin'` e tratado como tendo o papel (mesmo
 * curto-circuito de `authorizeModule`).
 *
 * @param req - Requisicao autenticada.
 * @returns Papeis disponiveis (hoje apenas `diretor`).
 */
function resolveAvailableApproverRoles(req: AuthenticatedRequest): string[] {
  const user = req.user;
  if (user?.role === 'admin') return ['diretor'];
  return user?.permissions?.diretor ? ['diretor'] : [];
}

/**
 * `Transaction` do Sequelize expõe `finished` em runtime, mas a definição
 * de tipos pública do pacote não a declara — mesmo padrão usado no projeto
 * inteiro para evitar `rollback()` duplo depois de um `commit()` bem-sucedido.
 */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

/** Desfaz (`ROLLBACK`) uma transacao Sequelize ainda pendente, se houver. */
async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

function extractZodIssues(error: unknown): unknown[] | null {
  if (error && typeof error === 'object' && 'issues' in error) {
    return (error as { issues: unknown[] }).issues;
  }
  return null;
}

/** `GET /api/comex/import-processes` — listagem paginada, filtro por status/fornecedor. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listImportProcessQuerySchema.parse(req.query);
    const useCase = new ListImportProcessesUseCase(comexRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) {
    const issues = extractZodIssues(error);
    if (issues) return next(new ValidationError('Payload invalido.', issues));
    next(error);
  }
};

/** `GET /api/comex/import-processes/:id` — detalhe com itens/fornecedor/criador. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetImportProcessByIdUseCase(comexRepository);
    const importProcess = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: importProcess });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/comex/import-processes` — registra um processo de importacao com seus itens (tributos calculados na criacao). */
exports.create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = createImportProcessSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateImportProcessUseCase(comexRepository, itemRepository);
    const importProcess = await useCase.execute({
      ...parsed.data,
      created_by: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { status: importProcess?.status, supplier_id: importProcess?.supplier_id },
      description: `Processo de importacao ${importProcess?.process_number} registrado`,
    });

    res.status(201).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `POST /api/comex/import-processes/:id/approve` — G11-COMEX: registra a
 * aprovacao da DIRETORIA sobre o processo de importacao (nao embarca o
 * processo; o embarque continua sendo `POST /:id/tracking` com
 * `event = 'shipped'`, que passa a exigir esta aprovacao).
 *
 * `approver_user_id` vem SEMPRE do JWT e `approver_role` e SEMPRE resolvido
 * por RBAC (`resolveAvailableApproverRoles`) — nada disso e aceito do body
 * (regra P0 anti-spoofing do projeto). Sem body: qualquer payload enviado e
 * simplesmente ignorado.
 *
 * Transacional: a leitura do processo (com lock), a checagem de duplicidade
 * de papel e a gravacao acontecem na mesma transacao, para que duas
 * requisicoes simultaneas do mesmo diretor nao gerem duas linhas (a UNIQUE
 * `uq_import_process_approvals_process_role` e a garantia final).
 */
exports.approveAuthority = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new ApproveImportProcessUseCase(comexRepository);
    const approval = await useCase.execute({
      id: Number(req.params.id),
      approverUserId: req.user.id,
      availableRoles: resolveAvailableApproverRoles(req),
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'approve',
      entityType: 'ImportProcessApproval',
      entityId: approval?.id,
      entityDescription: `Processo de importacao ${req.params.id}`,
      newValues: {
        import_process_id: approval?.import_process_id,
        approver_role: approval?.approver_role,
        approver_user_id: approval?.approver_user_id,
      },
      description: `Alcada G11-COMEX: aprovacao "${approval?.approver_role}" registrada para o processo de importacao ${req.params.id}`,
    });

    res.status(201).json({ success: true, data: approval });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `GET /api/comex/import-processes/:id/approvals` — G11-COMEX: situacao da
 * alcada (papeis exigidos, aprovacoes registradas, o que falta e se o
 * processo ainda pode receber aprovacao). Somente leitura, sem efeito
 * colateral e sem transacao.
 */
exports.listApprovals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListImportProcessApprovalsUseCase(comexRepository);
    const data = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/comex/import-processes/:id/tracking` — registra embarque/chegada/desembaraco (embarque exige a alcada G11-COMEX). */
exports.registerTracking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = registerImportTrackingSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new RegisterImportTrackingUseCase(comexRepository);
    const importProcess = await useCase.execute({
      id: Number(req.params.id),
      ...parsed.data,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'register_tracking',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { event: parsed.data.event, status: importProcess?.status },
      description: `Acompanhamento "${parsed.data.event}" registrado no processo ${importProcess?.process_number}`,
    });

    res.status(201).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/comex/import-processes/:id/receive` — nacionaliza e da entrada em estoque com custo nacionalizado. */
exports.receive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new ReceiveImportProcessUseCase(comexRepository, itemRepository);
    const importProcess = await useCase.execute({
      id: Number(req.params.id),
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'receive',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { status: importProcess?.status },
      description: `Processo de importacao ${importProcess?.process_number} recebido (entrada em estoque com custo nacionalizado)`,
    });

    res.status(201).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/comex/import-processes/:id/cancel` — cancela um processo ainda nao recebido. */
exports.cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = cancelImportProcessSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CancelImportProcessUseCase(comexRepository);
    const importProcess = await useCase.execute({
      id: Number(req.params.id),
      reason: parsed.data.reason,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'cancel',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { status: importProcess?.status, reason: parsed.data.reason },
      description: `Processo de importacao ${importProcess?.process_number} cancelado`,
    });

    res.status(200).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
