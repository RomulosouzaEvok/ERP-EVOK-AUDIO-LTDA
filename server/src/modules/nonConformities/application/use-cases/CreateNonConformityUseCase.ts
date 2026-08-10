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
const { applySupplierReturn } = require('../services/SupplierReturnHandler');

const BLOCKABLE_STATUSES = ['available', 'quarantine', 'reserved'];
const RETURN_TO_SUPPLIER_ACTION = 'return_supplier';

/**
 * Prefixo do aviso gravado em `non_conformities.notes` quando a RNC NAO
 * conseguiu bloquear nenhum lote (gap G10). Constante para que a leitura
 * (tela/relatorio/teste) possa procurar o marcador sem depender do texto.
 */
const LOT_NOT_BLOCKED_WARNING_PREFIX = '[ATENCAO: NENHUM LOTE BLOQUEADO]';

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

/**
 * Resultado da tentativa de bloqueio do lote referenciado pela RNC (gap G10).
 *
 * - `blocked`: lote encontrado em status bloqueavel e efetivamente bloqueado.
 * - `not_found`: `lot_number` informado, mas nenhum lote daquele produto
 *   corresponde (ex.: lote de sistema externo, ou digitacao errada).
 * - `not_blockable`: lote encontrado, porem em status terminal
 *   (`consumed`/`expired`) ou ja `blocked` — nada a fazer.
 * - `not_informed`: a RNC se refere a um produto, mas nao informou lote.
 * - `not_applicable`: a RNC nao se refere a produto (ex.: ativo, auditoria) —
 *   nao existe lote a bloquear e nao ha o que avisar.
 */
type LotBlockOutcome = 'blocked' | 'not_found' | 'not_blockable' | 'not_informed' | 'not_applicable';

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
   * material sob investigação).
   *
   * Gap G10 (auditoria da cadeia do produto, 2026-08-09): quando o bloqueio
   * NÃO acontece — lote não informado, não encontrado, ou em status que não
   * admite bloqueio — a RNC continua sendo criada, mas **deixa de ser
   * silenciosa**: um aviso explícito é gravado em `non_conformities.notes`
   * (ver {@link buildLotBlockWarning}) e volta no payload da resposta, já que
   * o endpoint devolve a RNC inteira. Até essa data uma RNC que não conteve
   * material nenhum era indistinguível de uma que bloqueou o lote — quem
   * abriu a RNC acreditava ter contido o material.
   *
   * **Por que avisar em vez de recusar:** a RNC é registro de qualidade e
   * evidência de auditoria (ISO 9001 8.7). Recusá-la porque o lote não foi
   * localizado faria o sistema perder o registro do defeito para proteger um
   * controle secundário — e a RNC legitimamente pode referenciar lote
   * externo (sistema legado/terceiro), material sem controle de lote, ou ser
   * de origem não-produto (`audit`, `customer_complaint`, ativo). Exigir o
   * lote também não resolve: continuaria criando RNC sem bloqueio sempre que
   * o número não existisse no `lot_controls`.
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
        lot = await this.nonConformitiesRepository.findLotForNonConformity(product_id, String(lot_number).trim(), t);
      }

      // G10: o desfecho do bloqueio de lote e resolvido ANTES da criacao,
      // para que o aviso ja nasca gravado na propria RNC quando nada for
      // bloqueado. Ate 2026-08-09 esse caminho era mudo: sem lote informado,
      // com lote inexistente ou com lote em status nao bloqueavel, a RNC era
      // criada exatamente igual a uma que bloqueou o lote — quem abriu a RNC
      // acreditava ter contido o material, e nao tinha.
      const lotBlockOutcome = this.resolveLotBlockOutcome(lot, lot_number, product_id);
      const lotBlockWarning = this.buildLotBlockWarning(lotBlockOutcome, lot, lot_number, product_id);

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
        status: 'open',
        // G10: aviso persistido na propria RNC (unico campo livre existente
        // — nenhuma coluna nova, nenhuma migration). Fica visivel em
        // `GET /api/quality/non-conformities/:id` e na tela, sem depender de
        // o cliente tratar um campo novo.
        notes: lotBlockWarning
      }, t);

      if (lotBlockOutcome === 'blocked') {
        await lot.update({
          status: 'blocked',
          notes: `${lot.notes ? `${lot.notes} | ` : ''}Bloqueado pela RNC #${nonConformity.id}`
        }, { transaction: t });
      }

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
   * Classifica o desfecho do bloqueio de lote da RNC (gap G10).
   *
   * @param lot - Lote encontrado (`lot_controls`) ou `null`.
   * @param lotNumber - `lot_number` informado no payload.
   * @param productId - `product_id` informado no payload.
   * @returns O desfecho do bloqueio.
   */
  private resolveLotBlockOutcome(lot: any, lotNumber?: string, productId?: number): LotBlockOutcome {
    if (lot) {
      return BLOCKABLE_STATUSES.includes(lot.status) ? 'blocked' : 'not_blockable';
    }
    // `lot_number` sem `product_id` nunca resolve: a busca de lote e por
    // (produto, numero do lote). Vale o mesmo aviso do lote inexistente.
    if (lotNumber) return 'not_found';
    return productId ? 'not_informed' : 'not_applicable';
  }

  /**
   * Monta o aviso explicito gravado em `non_conformities.notes` quando a RNC
   * nao bloqueou lote nenhum (gap G10).
   *
   * @param outcome - Desfecho calculado por {@link resolveLotBlockOutcome}.
   * @param lot - Lote encontrado ou `null`.
   * @param lotNumber - `lot_number` informado no payload.
   * @param productId - `product_id` informado no payload.
   * @returns Texto do aviso, ou `null` quando nao ha o que avisar
   *   (lote bloqueado com sucesso, ou RNC que nao se refere a produto).
   */
  private buildLotBlockWarning(outcome: LotBlockOutcome, lot: any, lotNumber?: string, productId?: number): string | null {
    if (outcome === 'blocked' || outcome === 'not_applicable') return null;

    const suffix = {
      not_found: lotNumber && !productId
        ? `o lote "${lotNumber}" foi informado sem product_id, e a busca de lote e por (produto, numero do lote) — nenhum lote pode ser localizado assim.`
        : `o lote "${lotNumber}" nao foi encontrado para este produto (pode ser lote externo ou numero digitado errado).`,
      not_blockable: `o lote "${lotNumber}" esta em status "${lot?.status}" e nao pode mais ser bloqueado.`,
      not_informed: 'nenhum lote foi informado na RNC. Se o defeito e de um lote especifico, informe lot_number para conter o material.',
    }[outcome as 'not_found' | 'not_blockable' | 'not_informed'];

    return `${LOT_NOT_BLOCKED_WARNING_PREFIX} Esta RNC nao conteve material: ${suffix}`;
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
    const receiptsCount = await this.nonConformitiesRepository.countLotsBySupplier(supplierId, transaction);

    if (receiptsCount === 0) {
      return;
    }

    const rncsCount = await this.nonConformitiesRepository.countNonConformitiesBySupplier(supplierId, transaction);
    const rawScore = 100 - (rncsCount / receiptsCount) * 100;
    const qualityScore = Math.max(0, Math.round(rawScore * 100) / 100);

    await this.nonConformitiesRepository.updateSupplierQualityScore(supplierId, qualityScore, transaction);
  }
}

export = CreateNonConformityUseCase;
