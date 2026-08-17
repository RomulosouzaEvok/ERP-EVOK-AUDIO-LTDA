import type { Request, Response, NextFunction } from 'express';

const SequelizeItemRepository = require('../../infrastructure/sequelize/SequelizeItemRepository');
const SequelizeItemEstruturaRepository = require('../../infrastructure/sequelize/SequelizeItemEstruturaRepository');
const SequelizeItemSupplierRepository = require('../../infrastructure/sequelize/SequelizeItemSupplierRepository');
const CreateItemUseCase = require('../../application/use-cases/CreateItemUseCase');
const UpdateItemUseCase = require('../../application/use-cases/UpdateItemUseCase');
const CreateItemStructureUseCase = require('../../application/use-cases/CreateItemStructureUseCase');
const ExplodeItemStructureUseCase = require('../../application/use-cases/ExplodeItemStructureUseCase');
const DeactivateItemUseCase = require('../../application/use-cases/DeactivateItemUseCase');
const ListItemSuppliersUseCase = require('../../application/use-cases/ListItemSuppliersUseCase');
const CreateItemSupplierUseCase = require('../../application/use-cases/CreateItemSupplierUseCase');
const UpdateItemSupplierUseCase = require('../../application/use-cases/UpdateItemSupplierUseCase');
const DeactivateItemSupplierUseCase = require('../../application/use-cases/DeactivateItemSupplierUseCase');
const GetItemPurchaseHistoryUseCase = require('../../application/use-cases/GetItemPurchaseHistoryUseCase');
const {
  createItemSchema,
  updateItemSchema,
  createItemStructureSchema,
  listItemsQuerySchema,
  explodeItemStructureQuerySchema,
  createItemSupplierSchema,
  updateItemSupplierSchema,
} = require('../validators/itemValidators');
const { ValidationError } = require('../../../../errors');
const Validators = require('../../../../utils/validators');
const { logAction } = require('../../../../services/auditLogService');

const itemRepository = new SequelizeItemRepository();
const itemEstruturaRepository = new SequelizeItemEstruturaRepository();

/**
 * Limite físico de `audit_logs.entity_description` (`models/AuditLog.ts`:
 * `DataTypes.STRING(255)` → `varchar(255)` no baseline congelado).
 */
const ENTITY_DESCRIPTION_MAX = 255;

/**
 * Monta a identificação textual do item para `entityDescription`.
 *
 * Existe por causa do contorno de `OR-21` (ver `inactivate`): como
 * `entityId` não pode carregar o UUID, `entity_description` é o ÚNICO campo
 * onde o item fica identificado, e por isso precisa conter as duas chaves de
 * recuperação — `codigo` (chave humana única) e o UUID (chave técnica).
 *
 * A truncagem não é preciosismo: `codigo` é `varchar(80)` e `descricao` é
 * `varchar(240)`; concatenados com o UUID passam de 255 e o `INSERT` seria
 * rejeitado pelo Postgres. Como `logAction` nunca propaga erro ao chamador,
 * o efeito seria exatamente o modo de falha que este caso combate: HTTP 200
 * ao usuário e NENHUMA linha na trilha. Por isso só a `descricao` (campo
 * dispensável para recuperar a linha) é cortada; `codigo` e UUID ficam
 * sempre íntegros.
 *
 * @param codigo - Código do item (chave humana única).
 * @param descricao - Descrição livre do item.
 * @param itemId - UUID do item.
 * @returns Texto com no máximo 255 caracteres.
 */
function describeItem(codigo: string | undefined, descricao: string | undefined, itemId: string): string {
  const sufixo = ` (uuid ${itemId})`;
  const prefixo = codigo ? `${codigo} — ` : '';
  const espaco = ENTITY_DESCRIPTION_MAX - sufixo.length - prefixo.length;
  const corpo = (descricao ?? '').slice(0, Math.max(0, espaco));
  return `${prefixo}${corpo}${sufixo}`.slice(0, ENTITY_DESCRIPTION_MAX);
}
const itemSupplierRepository = new SequelizeItemSupplierRepository();

/**
 * Controller do modulo de itens industriais.
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listItemsQuerySchema.parse(req.query);
    const { page = 1, limit = 10 } = query;
    const { rows, count } = await itemRepository.list({
      search: query.search ? Validators.sanitizeSearch(query.search) : undefined,
      tipo: query.tipo,
      status: query.status,
      limit,
      offset: (page - 1) * limit,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createItemSchema.parse(req.body);
    const useCase = new CreateItemUseCase(itemRepository);
    const item = await useCase.execute(body);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * PATCH /api/items/:id
 * Atualiza campos cadastrais de um item (partial update). Inclui o opt-in
 * de conversao automatica do MRP (`conversao_automatica`).
 */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateItemSchema.parse(req.body);
    const useCase = new UpdateItemUseCase(itemRepository);
    const item = await useCase.execute({ itemId: req.params.id, data: body });
    res.json({ success: true, data: item });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.createStructure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createItemStructureSchema.parse({ ...req.body, item_pai_id: req.params.id, criado_por: (req as any).user?.id ?? null });
    const useCase = new CreateItemStructureUseCase(itemRepository, itemEstruturaRepository);
    const structure = await useCase.execute(body);
    res.status(201).json({ success: true, data: structure });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.explode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = explodeItemStructureQuerySchema.parse(req.query);
    const useCase = new ExplodeItemStructureUseCase(itemRepository, itemEstruturaRepository);
    const data = await useCase.execute({
      itemId: req.params.id,
      quantity: query.quantity,
      dueDate: query.due_date,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * `PATCH /api/items/:id/inactivate` **e** `DELETE /api/items/:id` — inativa um
 * item (soft delete) com verificacao de vinculos ativos. Retorna 409 se houver
 * dependencias (BOM, OP, movimentos, lotes, MRP).
 *
 * As DUAS rotas apontam para este mesmo handler
 * (`presentation/routes/items.ts:20-21`), logo a trilha instalada aqui cobre
 * ambas as portas de entrada. Quem consulta a trilha distingue uma da outra
 * por `audit_logs.method`/`route`, que `AuditLog.register` extrai do `req`.
 *
 * ## Trilha de auditoria (AUD-ALOG-01 item B — CASE-004, APR-2026-033)
 *
 * O modulo `items` nao chamava `logAction` em nenhuma camada: inativar um
 * item do cadastro mestre industrial (327 insumos reais em producao)
 * respondia 200 sem registrar quem fez, quando e de onde. O `logAction` fica
 * no controller porque e aqui que existe o `req` — dele `AuditLog.register`
 * extrai `user_id`, `user_name`, `user_ip`, `user_agent`, `route` e `method`
 * (`src/models/AuditLog.ts:149-163`). Registro sem autor NAO fecha este
 * finding; autoria e o requisito central, nao um detalhe.
 *
 * ## `entityId: undefined` — CONTORNO DECLARADO de `AUD-DB-04` (`OR-21`)
 *
 * `Item.id` e UUID (`src/models/Item.ts:49-53`) e `audit_logs.entity_id` e
 * `integer` (`AuditLog.ts:85` e baseline congelado). `AuditLog.register` faz
 * `Number(entityId)`, e `Number('<uuid>')` = `NaN` → o `INSERT` e rejeitado
 * (`22P02`). A degradacao de `auditLogService` NAO socorre este caso: ela so
 * reconhece erro de `enum_audit_logs_action`
 * (`auditActions.ts#isUnsupportedAuditActionError`). O resultado de passar o
 * UUID aqui seria 200 ao usuario + linha inexistente no banco + entrada em
 * `logs/audit-failures.log` — PIOR que a ausencia de trilha, porque
 * pareceria remediado.
 *
 * Por isso `entityId` fica `undefined` (grava `NULL`) e o item e identificado
 * em `entityDescription` (codigo + UUID) e repetido em `oldValues`/`newValues`.
 * Mesmo contorno ja praticado por
 * `modules/engineering/.../engineeringController.ts` (`upsertTechnicalSpec`)
 * para entidade UUID.
 *
 * ⚠️ Isto e **contorno declarado, nao correcao de causa-raiz**. Decidido pelo
 * dono em `APR-2026-034` D1 (Rota 2); a Rota 1 (migration em `audit_logs`)
 * foi recusada. **`AUD-DB-04` permanece MEDIUM e ABERTO.** Consequencia
 * operacional que ninguem deve descobrir por acidente: esta linha **nao e
 * recuperavel pelo indice `entity_type + entity_id`** — a consulta tem de ser
 * por `entity_type='Item'` + `entity_description`. Quando `AUD-DB-04` for
 * remediado, o backfill e um `UPDATE` por `entity_description`.
 *
 * O estado anterior e lido AQUI, e nao devolvido pelo use case, para nao
 * mudar o retorno de `DeactivateItemUseCase` (contrato `data: Item` consumido
 * por `client/src/api/items.ts` e por
 * `tests/unit/deactivate-item-http-409.test.ts`).
 *
 * Payload minimo e suficiente: apenas `status` e as duas chaves de
 * identificacao. Nao se serializa o item inteiro — `custo_padrao`, posicao de
 * estoque e demais campos comerciais nao tem por que ir para uma coluna
 * `json` livre, sem mascaramento e sem imutabilidade (`AUD-DB-08`,
 * `FIND-ERP-002`).
 *
 * Nota de nao-atomicidade: a pre-leitura e a escrita nao sao atomicas — o
 * mesmo comportamento de todo o padrao de auditoria ja existente no
 * repositorio, registrado para nao ser surpresa no reteste.
 */
exports.inactivate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await itemRepository.findById(req.params.id);

    const useCase = new DeactivateItemUseCase(itemRepository, itemEstruturaRepository);
    const item = await useCase.execute({ itemId: req.params.id });

    // So chega aqui se a inativacao ocorreu: `NotFoundError` (404) e
    // `ConflictError` (409, vinculos ativos) sao lancados antes.
    const itemId = String(item?.id ?? before?.id ?? req.params.id);
    const codigo = before?.codigo ?? item?.codigo;

    logAction(req, {
      action: 'soft_delete',
      entityType: 'Item',
      // AUD-DB-04 / OR-21: NAO e um `undefined` orfao — ver o bloco de
      // contorno declarado no JSDoc acima. Passar o UUID aqui apagaria a
      // trilha em silencio.
      entityId: undefined,
      entityDescription: describeItem(codigo, before?.descricao ?? item?.descricao, itemId),
      oldValues: { item_id: itemId, codigo: codigo ?? null, status: before?.status ?? null },
      newValues: { item_id: itemId, codigo: codigo ?? null, status: item?.status ?? 'INATIVO' },
      description: `Item ${codigo ?? itemId} inativado (soft delete) via ${req.method} ${req.originalUrl}`,
    });

    res.json({ success: true, data: item });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * GET /api/items/:id/suppliers
 * Lista os fornecedores vinculados a um item (catalogo N:N).
 */
exports.listSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListItemSuppliersUseCase(itemRepository, itemSupplierRepository);
    const data = await useCase.execute({ itemId: req.params.id });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
};

/**
 * POST /api/items/:id/suppliers
 * Cria um vinculo item x fornecedor. Se `preferred=true`, zera o preferencial
 * dos demais vinculos do item (transacao).
 */
exports.createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createItemSupplierSchema.parse(req.body);
    const useCase = new CreateItemSupplierUseCase(itemRepository, itemSupplierRepository);
    const data = await useCase.execute({ itemId: req.params.id, ...body });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * PUT /api/items/:id/suppliers/:linkId
 * Atualiza campos comerciais do vinculo item x fornecedor.
 */
exports.updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateItemSupplierSchema.parse(req.body);
    const useCase = new UpdateItemSupplierUseCase(itemSupplierRepository);
    const data = await useCase.execute({ itemId: req.params.id, linkId: Number(req.params.linkId), ...body });
    res.json({ success: true, data });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * DELETE /api/items/:id/suppliers/:linkId
 * Desativa (soft delete) um vinculo item x fornecedor.
 */
exports.removeSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new DeactivateItemSupplierUseCase(itemSupplierRepository);
    const data = await useCase.execute({ itemId: req.params.id, linkId: Number(req.params.linkId) });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /api/items/:id/purchase-history
 * Retorna o historico de compras do item agregado por fornecedor.
 */
exports.getPurchaseHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetItemPurchaseHistoryUseCase(itemRepository, itemSupplierRepository);
    const data = await useCase.execute({ itemId: req.params.id });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
};
