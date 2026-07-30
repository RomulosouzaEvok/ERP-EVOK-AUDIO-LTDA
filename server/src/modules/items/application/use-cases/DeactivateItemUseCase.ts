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
import { ConflictError, NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';
const { Op } = require('sequelize');
const {
  LotControl,
  ProductionOrder,
  InventoryMovement,
  MrpOrdemPlanejada,
  Product
} = require('../../../../models/index');

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
   * @throws ConflictError se houver vinculos ativos.
   */
  public async execute(input: DeactivateItemInput): Promise<any> {
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    const vinculos = await this.verificarVinculos(item);

    const hasVinculos = Object.values(vinculos).some(Boolean);
    if (hasVinculos) {
      throw new ConflictError(
        'Item possui vinculos ativos e nao pode ser inativado.',
        vinculos,
      );
    }

    return this.itemRepository.update(input.itemId, { status: 'INATIVO' });
  }

  /**
   * Verifica todos os possiveis vinculos de um item.
   *
   * @param item - Item canonico.
   * @returns Objeto com todos os vinculos verificados.
   */
  private async verificarVinculos(item: any): Promise<VinculosVerificados> {
    const relatedProductIds = await this.resolveRelatedProductIds(item);
    const [
      estruturaAtiva,
      opAberta,
      movimentoEstoque,
      loteVinculado,
      ordemMrp,
    ] = await Promise.all([
      // 1. Verifica se o item aparece em alguma estrutura BOM ativa (como pai ou componente)
      this.itemEstruturaRepository.hasActiveParentOrComponent(item.id),

      // 2. Verifica se existem ordens de producao abertas para este item
      ProductionOrder.count({
        where: {
          product_id: { [Op.in]: relatedProductIds },
          status: { [Op.in]: ['planned', 'released', 'in_progress', 'paused'] },
        },
      }).then((count: number) => count > 0),

      // 3. Verifica se existem movimentos de estoque para este item
      InventoryMovement.count({
        where: { product_id: { [Op.in]: relatedProductIds } },
      }).then((count: number) => count > 0),

      // 4. Verifica se existem lotes vinculados
      LotControl.count({
        where: { product_id: { [Op.in]: relatedProductIds } },
      }).then((count: number) => count > 0),

      // 5. Verifica se existem ordens MRP planejadas
      MrpOrdemPlanejada.count({
        where: {
          item_id: item.id,
          status: { [Op.notIn]: ['CANCELADA', 'CONCLUIDA'] },
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

  /**
   * Resolve os products legados relacionados a um item canonico pelo codigo.
   *
   * @param item - Item canonico.
   * @returns number[] com IDs de products relacionados ou [-1] se nao houver.
   */
  private async resolveRelatedProductIds(item: any): Promise<number[]> {
    const products = await Product.findAll({
      where: { code: item.codigo },
      attributes: ['id']
    });
    const ids = products.map((product: any) => Number(product.id)).filter((id: number) => Number.isFinite(id));
    return ids.length > 0 ? ids : [-1];
  }
}

export = DeactivateItemUseCase;

