/**
 * Use case: registrar uma nova não conformidade.
 *
 * @module modules/nonConformities/application/use-cases/CreateNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
import { sequelize } from '../../../../config/database';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LotControl, Supplier, NonConformity } = require('../../../../models/index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applySupplierReturn } = require('../services/SupplierReturnHandler');

const BLOCKABLE_STATUSES = ['available', 'quarantine', 'reserved'];
const RETURN_TO_SUPPLIER_ACTION = 'return_supplier';

interface CreateNonConformityInput {
  product_id?: number;
  purchase_item_id?: number;
  asset_id?: number;
  production_order_id?: number;
  supplier_id?: number;
  description?: string;
  severity?: string;
  origin?: string;
  defect_type?: string;
  quantity_affected?: number;
  immediate_action?: string;
  lot_number?: string;
  reportedBy: number;
}

class CreateNonConformityUseCase extends UseCase<CreateNonConformityInput, any> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * Cria a RNC e, quando o payload referenciar um lote existente
   * (`lot_number` + `product_id`), bloqueia o lote na MESMA transação
   * (rastreabilidade: qualidade fecha o loop impedindo consumo/expedição de
   * material sob investigação). Se o lote não for encontrado, a RNC ainda
   * assim é criada normalmente — ela pode referenciar um lote externo (ex.:
   * lote de um sistema legado ou de terceiros).
   *
   * Realimentação de rating de fornecedor (item 8 do levantamento,
   * pendência deixada em aberto em 2026-08-03): quando o lote referenciado
   * tem `supplier_id` (veio de um recebimento de compra — ver
   * `ReceivePurchaseItemsUseCase`), `suppliers.quality_score` daquele
   * fornecedor é recalculado, na MESMA transação, pela fórmula
   * `MAX(0, 100 - (rncs_count / receipts_count * 100))`, onde
   * `receipts_count` = COUNT(lot_controls WHERE supplier_id = X) e
   * `rncs_count` = COUNT(non_conformities WHERE supplier_id = X). RNCs que
   * não referenciam lote (ou cujo lote não tem fornecedor, ex.: lote de
   * produção interna) NÃO alteram nenhum rating — não há como atribuir a
   * responsabilidade a um fornecedor sem essa rastreabilidade.
   *
   * Devolução ao fornecedor (Bloco B, docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md):
   * quando `immediate_action = 'return_supplier'`, a MESMA transação
   * também aciona `SupplierReturnHandler.applySupplierReturn` — estorna
   * estoque (item produtivo/uso-consumo, via `purchase_item_id`) ou muda
   * `Asset.status` (ativo imobilizado, via `asset_id`). A tratativa
   * comercial em si (crédito/reposição/cancelamento) vira item de trabalho
   * na fila de Compras via contador de handoff
   * (`GetDashboardHandoffsUseCase`), não é resolvida aqui.
   *
   * @param input - Dados da não conformidade (description obrigatória) e id do usuário autenticado.
   * @returns Não conformidade criada.
   * @throws {ValidationError} Se `description` estiver ausente.
   */
  public async execute(input: CreateNonConformityInput): Promise<any> {
    const {
      product_id,
      purchase_item_id,
      asset_id,
      production_order_id,
      supplier_id,
      description,
      severity,
      origin,
      defect_type,
      quantity_affected,
      immediate_action,
      lot_number,
      reportedBy
    } = input;

    if (!description) {
      throw new ValidationError('Descrição é obrigatória');
    }

    const t = await sequelize.transaction();
    try {
      // Busca o lote ANTES de criar a RNC (quando referenciado) para poder
      // herdar o fornecedor do recebimento no campo `supplier_id` da RNC
      // quando o payload não informar um explicitamente — sem isso,
      // `non_conformities.supplier_id` ficaria nulo para praticamente todas
      // as RNCs de recebimento/produção, inviabilizando o cálculo de
      // `rncs_count` por fornecedor.
      let lot: any = null;
      if (lot_number && product_id) {
        lot = await LotControl.findOne({
          where: { product_id, lot_number: String(lot_number).trim() },
          transaction: t,
          lock: t.LOCK.UPDATE
        });
      }

      const resolvedSupplierId = supplier_id ?? (lot ? lot.supplier_id : null) ?? undefined;

      const nonConformity = await this.nonConformitiesRepository.create({
        // nc_number segue o mesmo padrao de numeracao de RQ/PO do sistema.
        nc_number: `NC-${Date.now()}`,
        product_id,
        purchase_item_id,
        asset_id,
        production_order_id,
        supplier_id: resolvedSupplierId,
        description,
        // Defaults validos conforme os ENUMs do modelo NonConformity.
        severity: severity || 'minor',
        origin: origin || 'in_process',
        defect_type: defect_type || 'other',
        quantity_affected,
        immediate_action,
        lot_number,
        reported_by: reportedBy,
        status: 'open'
      }, t);

      if (lot && BLOCKABLE_STATUSES.includes(lot.status)) {
        await lot.update({
          status: 'blocked',
          notes: `${lot.notes ? `${lot.notes} | ` : ''}Bloqueado pela RNC #${nonConformity.id}`
        }, { transaction: t });
      }
      // Lote não encontrado (ou já em status terminal, ex.: 'consumed'):
      // segue sem erro — a RNC pode referenciar um lote externo.

      if (lot && lot.supplier_id) {
        await this.recalculateSupplierQualityScore(lot.supplier_id, t);
      }

      if (immediate_action === RETURN_TO_SUPPLIER_ACTION) {
        await applySupplierReturn({
          nonConformityId: nonConformity.id,
          purchaseItemId: purchase_item_id,
          assetId: asset_id,
          quantityAffected: quantity_affected,
          userId: reportedBy
        }, t);
      }

      await t.commit();
      return nonConformity;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Recalcula `suppliers.quality_score` de forma síncrona, na transação
   * informada, a partir da taxa de RNCs por recebimentos do fornecedor.
   *
   * Fórmula: `quality_score = MAX(0, 100 - (rncs_count / receipts_count * 100))`.
   * Sem nenhum recebimento (`receipts_count === 0`) o cálculo não é
   * determinável — o campo é deixado no default neutro (100) e nenhum
   * `UPDATE` é emitido.
   *
   * @param supplierId - Id do fornecedor (`lot_controls.supplier_id` do lote referenciado pela RNC).
   * @param transaction - Transação Sequelize compartilhada com a criação da RNC.
   * @returns void
   */
  private async recalculateSupplierQualityScore(supplierId: number, transaction: any): Promise<void> {
    const receiptsCount = await LotControl.count({ where: { supplier_id: supplierId }, transaction });

    if (receiptsCount === 0) {
      return;
    }

    const rncsCount = await NonConformity.count({ where: { supplier_id: supplierId }, transaction });
    const rawScore = 100 - (rncsCount / receiptsCount) * 100;
    const qualityScore = Math.max(0, Math.round(rawScore * 100) / 100);

    await Supplier.update(
      { quality_score: qualityScore },
      { where: { id: supplierId }, transaction }
    );
  }
}

export = CreateNonConformityUseCase;
