/**
 * Serviço de aplicação: consequência real de uma RNC com
 * `immediate_action = 'return_supplier'` (Bloco B,
 * docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, seção 3 do
 * contexto de negócio).
 *
 * Compartilhado por `CreateNonConformityUseCase` e
 * `UpdateNonConformityUseCase` (a devolução pode ser decidida já na
 * abertura da RNC ou só depois, ao editar `immediate_action` numa RNC
 * existente) — mesma lógica, mesma transação do chamador.
 *
 * Qualidade decide QUE devolver (dispara este handler); Compras decide
 * COMO resolver com o fornecedor (crédito, reposição, cancelamento) — por
 * isso a consequência aqui se limita a: (a) estornar o efeito físico do
 * recebimento (estoque ou status do ativo) e (b) abrir o item de trabalho
 * na fila de Compras (via contador de handoff, não aqui diretamente — ver
 * `GetDashboardHandoffsUseCase`). O fechamento comercial da devolução
 * (nota de devolução, crédito, novo pedido) é manual, fora deste módulo.
 *
 * @module modules/nonConformities/application/services/SupplierReturnHandler
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PurchaseItem, Item, Asset, InventoryMovement } = require('../../../../models/index');

/** Tipos de `Item.tipo` tratados como devolução física de estoque (produtivo ou uso/consumo — ambos ficam fisicamente no armazém). */
const STOCK_ITEM_TYPES = ['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO', 'USO_E_CONSUMO'];

interface SupplierReturnResult {
  inventoryMovementId: number | null;
  assetId: number | null;
  assetPreviousStatus: string | null;
}

/**
 * Aplica a consequência de uma devolução ao fornecedor para a RNC
 * informada, na MESMA transação da criação/atualização da RNC.
 *
 * Regras:
 * - `purchase_item_id` presente e resolvendo (via `PurchaseItem.item_id`)
 *   para um `Item.tipo` de estoque (`MATERIA_PRIMA`/`SUBCONJUNTO`/
 *   `PRODUTO_ACABADO`/`USO_E_CONSUMO`, ou quando o item novo não é
 *   rastreável ainda — comportamento default): gera `InventoryMovement`
 *   tipo `out` estornando a entrada original (`reference_type: 'purchase'`,
 *   `reference_id` = id do pedido de compra do `purchase_item_id`),
 *   decrementando `products.quantity` via `InventoryService.consume`.
 * - `asset_id` presente (RNC referenciando um `ATIVO_IMOBILIZADO`, ex.:
 *   equipamento com defeito de fábrica comprado): atualiza
 *   `Asset.status = 'returned_to_supplier'` (decisão documentada em
 *   `docs/HANDOFF_CODEX.md` — não reaproveita `lost`, que é semanticamente
 *   incorreto para um ativo com fornecedor/processo de RMA conhecidos).
 * - Nem `purchase_item_id` nem `asset_id` informados: no-op silencioso —
 *   a RNC pode referenciar `return_supplier` apenas como intenção
 *   textual, sem vínculo suficiente para automação (ex.: devolução via
 *   lote legado sem `purchase_item_id`).
 *
 * @param params - Referências resolvidas da RNC (id, quantidade, ids do usuário/transação).
 * @param params.nonConformityId - Id da RNC recém-criada/atualizada (para rastreabilidade na `description` do estorno).
 * @param params.purchaseItemId - `NonConformity.purchase_item_id`, quando informado.
 * @param params.assetId - `NonConformity.asset_id`, quando informado.
 * @param params.quantityAffected - `NonConformity.quantity_affected` (quantidade a estornar do estoque).
 * @param params.userId - Id do usuário responsável pela RNC (autor do estorno/atualização).
 * @param transaction - Transação Sequelize compartilhada com o chamador.
 * @returns Ids afetados (movimento de estoque e/ou ativo), para uso em testes/observabilidade.
 */
async function applySupplierReturn(
  params: {
    nonConformityId: number;
    purchaseItemId?: number | null;
    assetId?: number | null;
    quantityAffected?: number | null;
    userId: number;
  },
  transaction: any
): Promise<SupplierReturnResult> {
  const { nonConformityId, purchaseItemId, assetId, quantityAffected, userId } = params;

  const result: SupplierReturnResult = {
    inventoryMovementId: null,
    assetId: null,
    assetPreviousStatus: null,
  };

  // Ativo imobilizado: muda status, não mexe em estoque físico (ativo não
  // tem `quantity` em Product/InventoryMovement).
  if (assetId) {
    const asset = await Asset.findByPk(assetId, { transaction, lock: transaction.LOCK.UPDATE });
    if (asset && asset.status !== 'returned_to_supplier') {
      result.assetPreviousStatus = asset.status;
      await asset.update({
        status: 'returned_to_supplier',
        notes: `${asset.notes ? `${asset.notes} | ` : ''}Devolvido ao fornecedor via RNC #${nonConformityId}`
      }, { transaction });
      result.assetId = asset.id;
    }
    // Ativo e item de estoque são mutuamente exclusivos por RNC — se
    // `asset_id` foi informado, não há `purchase_item_id` de item de
    // estoque a estornar na mesma RNC.
    return result;
  }

  if (!purchaseItemId) {
    return result;
  }

  const purchaseItem = await PurchaseItem.findByPk(purchaseItemId, { transaction });
  if (!purchaseItem) {
    return result;
  }

  // Resolve o tipo do item novo (Item.tipo) quando o expand-contract já
  // populou `PurchaseItem.item_id`. Sem esse vínculo (compra legada,
  // apenas `product_id`), o item é tratado como produtivo por default —
  // é o comportamento histórico do sistema antes da segregação
  // MRO/Capital Asset (Bloco A) e evita silenciosamente deixar de
  // estornar estoque de compras legadas.
  let itemTipo: string | null = null;
  if (purchaseItem.item_id) {
    const item = await Item.findByPk(purchaseItem.item_id, { transaction });
    itemTipo = item ? item.tipo : null;
  }

  if (itemTipo && !STOCK_ITEM_TYPES.includes(itemTipo)) {
    // ATIVO_IMOBILIZADO sem `asset_id` vinculado na RNC (dado incompleto)
    // ou tipo desconhecido — não há o que estornar em estoque físico.
    return result;
  }

  const qty = Number(quantityAffected) > 0 ? Number(quantityAffected) : null;
  if (!qty) {
    // Sem quantidade afetada informada não há o que estornar com
    // segurança (evita decrementar estoque com valor arbitrário).
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const InventoryService = require('../../../../services/inventoryService');
  const { movementId } = await InventoryService.consume(
    purchaseItem.product_id,
    qty,
    userId,
    transaction,
    {
      description: `Devolução ao fornecedor (RNC #${nonConformityId}) — estorno do recebimento PO ${purchaseItem.purchase_id}`,
      referenceId: purchaseItem.purchase_id,
      referenceType: 'purchase'
    }
  );
  result.inventoryMovementId = movementId ?? null;

  return result;
}

module.exports = { applySupplierReturn, STOCK_ITEM_TYPES };
