import type { Request, Response, NextFunction } from 'express';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeInventoryRepository = require('../../infrastructure/sequelize/SequelizeInventoryRepository');
const ListInventoryMovementsUseCase = require('../../application/use-cases/ListInventoryMovementsUseCase');
const GetInventoryMovementByIdUseCase = require('../../application/use-cases/GetInventoryMovementByIdUseCase');
const CreateInventoryMovementUseCase = require('../../application/use-cases/CreateInventoryMovementUseCase');
const GetStockReportUseCase = require('../../application/use-cases/GetStockReportUseCase');
const ListLowStockUseCase = require('../../application/use-cases/ListLowStockUseCase');
const ListLotsUseCase = require('../../application/use-cases/ListLotsUseCase');
const GetLotByCodeUseCase = require('../../application/use-cases/GetLotByCodeUseCase');
const GenerateEntityQrCodeUseCase = require('../../../../shared/application/GenerateEntityQrCodeUseCase');
const { LotControl, Product } = require('../../../../models/index');
const ReleaseLotUseCase = require('../../application/use-cases/ReleaseLotUseCase');
// G7: a liberação de lote passou a depender do registro de inspeção
// (ISO 9001 8.6). O repositório de qualidade é injetado como gateway de
// leitura — ver `ReleaseLotUseCase`.
const SequelizeQualityRepository = require('../../../quality/infrastructure/sequelize/SequelizeQualityRepository');
const BlockLotUseCase = require('../../application/use-cases/BlockLotUseCase');
const CreateWarehouseTransferUseCase = require('../../application/use-cases/CreateWarehouseTransferUseCase');
const ApproveWarehouseTransferUseCase = require('../../application/use-cases/ApproveWarehouseTransferUseCase');
const RejectWarehouseTransferUseCase = require('../../application/use-cases/RejectWarehouseTransferUseCase');
const ListWarehouseTransfersUseCase = require('../../application/use-cases/ListWarehouseTransfersUseCase');
const ListWarehouseStockUseCase = require('../../application/use-cases/ListWarehouseStockUseCase');
const ListWarehousesUseCase = require('../../application/use-cases/ListWarehousesUseCase');
const CreateWarehouseUseCase = require('../../application/use-cases/CreateWarehouseUseCase');
const UpdateWarehouseUseCase = require('../../application/use-cases/UpdateWarehouseUseCase');
const {
  createInventoryMovementSchema,
  createWarehouseTransferSchema,
  rejectWarehouseTransferSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  idParamSchema,
  handleZodError
} = require('../validators/inventoryValidators');

/**
 * Controller enxuto do módulo `inventory`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação (que por sua vez
 * delegam a alteração real de `Product.quantity` ao já existente
 * `InventoryService`) e devolve sempre o envelope padrão
 * `{ success: true, data, ... }` — mantendo exatamente o mesmo formato JSON
 * do controller anterior (`inventoryController.ts`, hoje removido do
 * repositório — histórico no git).
 */
const inventoryRepository = new SequelizeInventoryRepository();
const qualityRepository = new SequelizeQualityRepository();

/**
 * `GET /api/inventory/movements` — lista movimentações de estoque com filtros e paginação.
 *
 * DUAL-READ: Aceita `product_id` (legado) OU `item_id` (novo, PREFERIDO).
 *
 * Aceita também o filtro opcional `warehouse_id` (INTEGER) — quando
 * informado, restringe a lista às movimentações registradas naquele
 * depósito (`InventoryMovement.warehouse_id`). Quando ausente, o
 * comportamento é exatamente o mesmo de antes (lista todas).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, product_id, item_id, type, start_date, end_date, warehouse_id } = req.query;
    const useCase = new ListInventoryMovementsUseCase(inventoryRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      product_id: product_id ? parseInt(String(product_id), 10) : undefined,
      item_id: String(item_id || '').trim() || undefined,
      type,
      start_date,
      end_date,
      warehouse_id: warehouse_id ? parseInt(String(warehouse_id), 10) : undefined,
      limit: parseInt(String(limit), 10),
      offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10),
      page: parseInt(String(page), 10)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/movements/:id` — busca uma movimentação de estoque pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetInventoryMovementByIdUseCase(inventoryRepository);
    const movement = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: movement });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/movements` — registra uma movimentação de estoque
 * (entrada/saída/ajuste), aplicando lock pessimista e transação via
 * `InventoryService.adjust` (Fase 4.1).
 *
 * DUAL-READ: Aceita `product_id` (legado) OU `item_id` (novo, PREFERIDO).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = createInventoryMovementSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { product_id, item_id, type, quantity, description, reference_id, reference_type, warehouse_code } = parsed.data;
    const useCase = new CreateInventoryMovementUseCase();
    try {
      // `InventoryService.adjust` (chamado internamente pelo use case) retorna
      // `{ ..., movementId }`, não `{ movement }` — desestruturar `movement`
      // aqui derrubava o processo inteiro: o `TypeError` de `movement.id`
      // undefined era lançado DEPOIS do `t.commit()` já ter sido efetivado,
      // caía no `catch` abaixo, que tentava `t.rollback()` numa transação já
      // commitada (`Transaction cannot be rolled back because it has been
      // finished with state: commit`) — exceção não tratada, crash fatal do
      // Node. Buscamos o registro real pós-commit para manter o mesmo
      // formato de resposta (`InventoryMovement` completo) já documentado
      // no client (`client/src/api/inventory.ts`, `createMovement`).
      const { movementId } = await useCase.execute({
        product_id, item_id, type, quantity, description, reference_id, reference_type, warehouse_code,
        userId: (req as any).user.id,
        transaction: t
      });

      await t.commit();

      const movement = await new GetInventoryMovementByIdUseCase(inventoryRepository).execute({ id: movementId });

      // Log de auditoria feito após o commit para não segurar locks de banco.
      const entityDesc = item_id ? `Item #${item_id}` : `Produto #${product_id}`;
      logAction(req, {
        action: type === 'out' ? 'update' : 'create',
        entityType: 'InventoryMovement',
        entityId: movementId,
        entityDescription: entityDesc,
        newValues: { type, quantity },
        description: `Movimentação de estoque (${type}) - quantidade ${quantity}`
      });

      res.status(201).json({ success: true, data: movement });
    } catch (innerError) {
      // Defesa extra: só faz rollback se a transação ainda não foi
      // finalizada (nem commit nem rollback já ocorreram) — chamar
      // `rollback()` numa transação já commitada lança um erro síncrono
      // não relacionado ao `innerError` original e derruba o processo.
      if (!t.finished) await t.rollback();
      throw innerError;
    }
  } catch (error: any) {
    if (!error.statusCode && !t.finished) await t.rollback();
    if (error.statusCode && !error.code) {
      // Erros lançados por InventoryService (Error simples com statusCode),
      // mantém o mesmo formato de resposta do controller anterior.
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * `GET /api/inventory/stock-report` — relatório consolidado de estoque
 * (resumo + lista de produtos ativos).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getStockReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetStockReportUseCase(inventoryRepository);
    const { summary, products } = await useCase.execute();
    res.json({ success: true, data: { summary, products } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/low-stock` — lista produtos ativos com estoque em ou
 * abaixo do ponto de reposição (`quantity <= min_quantity`). Endpoint novo
 * (aditivo), não substitui nenhum comportamento existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listLowStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListLowStockUseCase(inventoryRepository);
    const products = await useCase.execute();
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/lots?product_id=&status=&page=&limit=` — lista lotes
 * (`LotControl`) com filtros e paginação, incluindo `product` e `supplier`.
 *
 * DUAL-USO:
 * - Sem `status` e com `product_id` (uso legado/produção): mantém o
 *   comportamento anterior — apenas lotes `status='available'` com
 *   `quantity_available > 0`, usado para escolher lotes na conclusão de OP
 *   (`lot_consumptions` exigido por `ChangeProductionOrderStatusUseCase`).
 * - Com `status` explícito (ex.: `status=quarantine`): usado pela inspeção
 *   de recebimento de qualidade para listar lotes pendentes de liberação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_id, status, page, limit } = req.query;
    const useCase = new ListLotsUseCase(inventoryRepository);
    const { rows, total, page: p, limit: l, totalPages } = await useCase.execute({ product_id, status, page, limit });
    res.json({ success: true, data: rows, pagination: { total, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/lots/by-code/:lot_number?product_id=` — resolve um
 * lote a partir do código legível (`lot_number`) lido por scanner físico ou
 * digitado manualmente no mobile. `product_id` é opcional, usado apenas
 * para desambiguar quando o mesmo código existir em mais de um produto.
 *
 * Item 6 do roadmap (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`) —
 * rastreabilidade por lote/QR no chão de fábrica.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getLotByCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    const lot = await useCase.execute({ lot_number: req.params.lot_number, product_id: req.query.product_id });
    res.json({ success: true, data: lot });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/lots/:id/qrcode?format=png|svg` — gera o QR Code de
 * um lote (`LotControl`) para impressão em etiqueta física. Reaproveita o
 * `GenerateEntityQrCodeUseCase` genérico já usado por Ativos/Produtos —
 * nenhuma infraestrutura de QR nova foi criada.
 *
 * O QR codifica `{ type: 'lot', id, lot_number, product_code, product_name }`
 * — a leitura no mobile deve extrair `lot_number` e chamar
 * `GET /api/inventory/lots/by-code/:lot_number` para resolver o registro
 * completo (padrão dual: QR carrega o código legível, não o id interno).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getLotQrCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GenerateEntityQrCodeUseCase();
    const result = await useCase.execute({
      repository: {
        findById: (id: string | number) => LotControl.findByPk(id, {
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
        })
      },
      id: req.params.id,
      entityType: 'lot',
      entityLabel: 'Lote',
      format: req.query.format === 'svg' ? 'svg' : 'png',
      buildData: (lot: any) => ({
        lot_number: lot.lot_number,
        product_code: lot.product?.code,
        product_name: lot.product?.name
      }),
    });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/lots/:id/release` — libera um lote para consumo
 * (`quarantine|blocked` -> `available`). Usado pela inspeção de recebimento
 * (pós-quarentena) e pela qualidade (pós-tratativa de RNC). `body.notes` é
 * opcional.
 *
 * G7 (2026-08-10): exige que a inspeção MAIS RECENTE do lote
 * (`POST /api/quality/inspections`) tenha aprovado — caso contrário devolve
 * 422 com `details.rule = 'G7'` e **não grava nada**. Quem autoriza a
 * liberação vem sempre do JWT (`req.user.id`), nunca do body (ISO 9001 8.6 +
 * regra P0 de anti-spoofing).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.releaseLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ReleaseLotUseCase(inventoryRepository, qualityRepository);
    const lot = await useCase.execute({
      id: req.params.id,
      notes: req.body?.notes,
      releasedBy: (req as any).user.id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'LotControl',
      entityId: lot.id,
      entityDescription: `Lote ${lot.lot_number}`,
      newValues: {
        status: 'available',
        release_inspection_id: lot.release_inspection_id,
        released_by: lot.released_by,
      },
      description: `Lote ${lot.lot_number} liberado para consumo (inspecao #${lot.release_inspection_id})`
    });

    res.json({ success: true, data: lot });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/lots/:id/block` — bloqueia um lote
 * (`quarantine|available` -> `blocked`), com `body.reason` obrigatório
 * (mínimo 3 caracteres). Usado pela inspeção de recebimento e,
 * internamente, por `CreateNonConformityUseCase` ao registrar uma RNC
 * vinculada a um lote.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.blockLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new BlockLotUseCase(inventoryRepository);
    const lot = await useCase.execute({ id: req.params.id, reason: req.body?.reason });

    logAction(req, {
      action: 'update',
      entityType: 'LotControl',
      entityId: lot.id,
      entityDescription: `Lote ${lot.lot_number}`,
      newValues: { status: 'blocked', reason: req.body?.reason },
      description: `Lote ${lot.lot_number} bloqueado: ${req.body?.reason}`
    });

    res.json({ success: true, data: lot });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/transfers` — solicita transferência de saldo entre
 * depósitos (Bloco 4, UC-42 Fluxo F). Cria a transferência em
 * `status='pending'` — não altera nenhum saldo até a aprovação de um
 * gestor do módulo `estoque`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.createTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createWarehouseTransferSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { product_id, from_warehouse_code, to_warehouse_code, quantity, reason } = parsed.data;

    const useCase = new CreateWarehouseTransferUseCase(inventoryRepository);
    const transfer = await useCase.execute({
      product_id, from_warehouse_code, to_warehouse_code, quantity, reason,
      userId: (req as any).user.id
    });

    logAction(req, {
      action: 'create',
      entityType: 'WarehouseTransfer',
      entityId: transfer.id,
      entityDescription: `Transferencia #${transfer.id}`,
      newValues: { product_id, from_warehouse_code, to_warehouse_code, quantity, reason },
      description: `Transferencia solicitada: produto #${product_id} de ${from_warehouse_code} para ${to_warehouse_code} (${quantity})`
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/inventory/transfers/:id/approve` — aprova uma transferência
 * pendente (`authorizeModule('estoque', 'approve')`). Executa o
 * débito/crédito atômico entre depósitos na mesma transação e gera os
 * dois `InventoryMovement` (`type='transfer'`) vinculados.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.approveTransfer = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const useCase = new ApproveWarehouseTransferUseCase(inventoryRepository);
    const transfer = await useCase.execute({ id: req.params.id, approverId: (req as any).user.id, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'approve',
      entityType: 'WarehouseTransfer',
      entityId: transfer.id,
      entityDescription: `Transferencia #${transfer.id}`,
      newValues: { status: 'approved' },
      description: `Transferencia #${transfer.id} aprovada e executada entre depositos`
    });

    res.json({ success: true, data: transfer });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    next(error);
  }
};

/**
 * `PUT /api/inventory/transfers/:id/reject` — rejeita uma transferência
 * pendente (`authorizeModule('estoque', 'approve')`), com `body.reason`
 * obrigatório. Não altera nenhum saldo.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.rejectTransfer = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = rejectWarehouseTransferSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { reason } = parsed.data;

    const useCase = new RejectWarehouseTransferUseCase(inventoryRepository);
    const transfer = await useCase.execute({ id: req.params.id, approverId: (req as any).user.id, reason, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'reject',
      entityType: 'WarehouseTransfer',
      entityId: transfer.id,
      entityDescription: `Transferencia #${transfer.id}`,
      newValues: { status: 'rejected', reason },
      description: `Transferencia #${transfer.id} rejeitada: ${reason}`
    });

    res.json({ success: true, data: transfer });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    next(error);
  }
};

/**
 * `GET /api/inventory/transfers?status=` — lista transferências entre
 * depósitos com filtro opcional de status.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListWarehouseTransfersUseCase(inventoryRepository);
    const transfers = await useCase.execute({ status: req.query.status });
    res.json({ success: true, data: transfers });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=`
 * — lista saldos por par produto×depósito (Bloco 4, UC-42).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listWarehouseStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_id, warehouse_code, page, limit } = req.query;
    const useCase = new ListWarehouseStockUseCase(inventoryRepository);
    const { rows, total, page: p, limit: l, totalPages } = await useCase.execute({ product_id, warehouse_code, page, limit });
    res.json({ success: true, data: rows, pagination: { total, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/warehouses` — lista depósitos ativos.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listWarehouses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListWarehousesUseCase(inventoryRepository);
    const warehouses = await useCase.execute();
    res.json({ success: true, data: warehouses });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/warehouses` — cria um novo depósito
 * (`authorizeModule('estoque', 'approve')`, docs/governance/TODO.md, Bloco
 * 4.2/4.3). `code` deve ser único; é normalizado para uppercase.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.createWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createWarehouseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { code, name, description, active } = parsed.data;

    const useCase = new CreateWarehouseUseCase(inventoryRepository);
    const warehouse = await useCase.execute({ code, name, description, active });

    logAction(req, {
      action: 'create',
      entityType: 'Warehouse',
      entityId: warehouse.id,
      entityDescription: `Deposito ${warehouse.code}`,
      newValues: { code: warehouse.code, name: warehouse.name, description: warehouse.description, active: warehouse.active },
      description: `Deposito ${warehouse.code} criado`
    });

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/inventory/warehouses/:id` — edita `name`/`description`/`active`
 * de um depósito existente (`authorizeModule('estoque', 'approve')`). O
 * `code` NUNCA é editável por este endpoint — é a chave usada pelo
 * roteamento automático do dual-write em todo o sistema.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) handleZodError(parsedId.error);

    const parsed = updateWarehouseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { name, description, active } = parsed.data;

    const useCase = new UpdateWarehouseUseCase(inventoryRepository);
    const { before, warehouse } = await useCase.execute({ id: parsedId.data, name, description, active });

    logAction(req, {
      action: 'update',
      entityType: 'Warehouse',
      entityId: warehouse.id,
      entityDescription: `Deposito ${warehouse.code}`,
      oldValues: before,
      newValues: { name: warehouse.name, description: warehouse.description, active: warehouse.active },
      description: `Deposito ${warehouse.code} atualizado`
    });

    res.json({ success: true, data: warehouse });
  } catch (error) { next(error); }
};
