/**
 * Caso de uso para inativar (soft delete) um item industrial.
 * Antes de inativar, verifica se o item possui vinculos ativos:
 * - Estrutura BOM ativa como pai ou componente
 * - Ordens de producao abertas
 * - Movimentos de estoque
 * - Lotes vinculados
 *
 * @module modules/items/application/use-cases/DeactivateItemUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';
const { Op } = require('sequelize');
const { LotControl, ProductionOrder, InventoryMovement, MrpOrdemPlanejada } = require('../../../../models/index');

interface DeactivateItemInput {
  itemId: string;
}

interface VinculosVerificados {
  estrutura_ativa: boolean;
  op_aberta: boolean;
  movimento_estoque: boolean;
  lote_vinculado: boolean;
  ordem_mrp: boolean;
}

/**
 * Inativa um item, mas antes verifica todos os vinculos ativos.
 * Retorna erro 422 (BUSINESS_RULE_VIOLATION) se houver dependencias.
 */
class DeactivateItemUseCase extends UseCase<DeactivateItemInput, any> {
  private readonly itemRepository: ItemRepository;
  private readonly itemEstruturaRepository: ItemEstruturaRepository;

  public constructor(itemRepository: ItemRepository, itemEstruturaRepository: ItemEstruturaRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemEstruturaRepository = itemEstruturaRepository;
  }

  /**
   * Executa a inativacao do item com verificacao de vinculos.
   *
   * @param input - Dados com itemId.
   * @returns Item atualizado com status INATIVO.
   * @throws NotFoundError se item nao existir.
   * @throws BusinessRuleError se houver vinculos ativos.
   */
  public async execute(input: DeactivateItemInput): Promise<any> {
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    const vinculos = await this.verificarVinculos(input.itemId);

    const hasVinculos = Object.values(vinculos).some(Boolean);
    if (hasVinculos) {
      throw new BusinessRuleError(
        'Item possui vinculos ativos e nao pode ser inativado.',
        vinculos,
      );
    }

    return this.itemRepository.update(input.itemId, { status: 'INATIVO' });
  }

  /**
   * Verifica todos os possiveis vinculos de um item.
   *
   * @param itemId - UUID do item.
   * @returns Objeto com todos os vinculos verificados.
   */
  private async verificarVinculos(itemId: string): Promise<VinculosVerificados> {
    const [
      estruturaAtiva,
      opAberta,
      movimentoEstoque,
      loteVinculado,
      ordemMrp,
    ] = await Promise.all([
      // 1. Verifica se o item aparece em alguma estrutura BOM ativa (como pai ou componente)
      this.itemEstruturaRepository.hasActiveParentOrComponent(itemId),

      // 2. Verifica se existem ordens de producao abertas para este item
      ProductionOrder.count({
        where: {
          item_id: itemId,
          status: { [Op.in]: ['RASCUNHO', 'APROVADA', 'EM_EXECUCAO'] },
        },
      }).then((count: number) => count > 0),

      // 3. Verifica se existem movimentos de estoque para este item
      InventoryMovement.count({
        where: { item_id: itemId },
      }).then((count: number) => count > 0),

      // 4. Verifica se existem lotes vinculados
      LotControl.count({
        where: { item_id: itemId },
      }).then((count: number) => count > 0),

      // 5. Verifica se existem ordens MRP planejadas
      MrpOrdemPlanejada.count({
        where: {
          item_id: itemId,
          status: { [Op.in]: ['RASCUNHO', 'APROVADA', 'EM_EXECUCAO'] },
        },
      }).then((count: number) => count > 0),
    ]);

    return {
      estrutura_ativa: estruturaAtiva,
      op_aberta: opAberta,
      movimento_estoque: movimentoEstoque,
      lote_vinculado: loteVinculado,
      ordem_mrp: ordemMrp,
    };
  }
}

export = DeactivateItemUseCase;

