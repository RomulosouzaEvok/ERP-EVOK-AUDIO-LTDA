import UseCase from '../../../../shared/application/UseCase';
import { ConflictError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import { sequelize } from '../../../../config/database';
const ItemProductMirrorService = require('../../../../services/itemProductMirrorService');

/**
 * Caso de uso para criar item industrial.
 *
 * Desde 2026-08-12 (diagnóstico do catálogo duplo), criar um item garante o
 * produto gêmeo em `products` **na mesma transação** — sem isso, o item
 * ficava invisível para RFQ→pedido, requisição→pedido e COMEX (422 no
 * crosswalk `products.code = items.codigo`). Vale para TODOS os tipos,
 * inclusive suprimento/patrimônio (que precisam do gêmeo para serem
 * compráveis); quem os mantém fora da BOM é a guarda
 * `G1-BOM-TIPO-NAO-PRODUTIVO`. Ver `services/itemProductMirrorService.ts`.
 */
class CreateItemUseCase extends UseCase<Record<string, any>, any> {
  private readonly itemRepository: ItemRepository;

  public constructor(itemRepository: ItemRepository) {
    super();
    this.itemRepository = itemRepository;
  }

  /** Cria item (e o produto gêmeo, quando produtivo) validando duplicidade por codigo. */
  public async execute(input: Record<string, any>): Promise<any> {
    const existing = await this.itemRepository.findByCode(String(input.codigo));
    if (existing) {
      throw new ConflictError('Codigo do item ja cadastrado.');
    }

    const t = await sequelize.transaction();
    try {
      const item = await this.itemRepository.create({
        codigo: input.codigo,
        descricao: input.descricao,
        tipo: input.tipo,
        unidade: input.unidade,
        status: input.status ?? 'ATIVO',
        estoque_reservado: input.estoque_reservado ?? 0,
        estoque_seguranca: input.estoque_seguranca ?? 0,
        lote_minimo: input.lote_minimo ?? 0,
        lead_time_dias: input.lead_time_dias ?? 0,
        custo_padrao: input.custo_padrao ?? 0,
        fornecedor_padrao_id: input.fornecedor_padrao_id ?? null,
        conversao_automatica: input.conversao_automatica ?? false,
      }, t);

      await ItemProductMirrorService.ensureProductMirrorForItem(item, t);

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateItemUseCase;
