import UseCase from '../../../../shared/application/UseCase';
import { ConflictError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';

/**
 * Caso de uso para criar item industrial.
 */
class CreateItemUseCase extends UseCase<Record<string, any>, any> {
  private readonly itemRepository: ItemRepository;

  public constructor(itemRepository: ItemRepository) {
    super();
    this.itemRepository = itemRepository;
  }

  /** Cria item validando duplicidade por codigo. */
  public async execute(input: Record<string, any>): Promise<any> {
    const existing = await this.itemRepository.findByCode(String(input.codigo));
    if (existing) {
      throw new ConflictError('Codigo do item ja cadastrado.');
    }

    return this.itemRepository.create({
      codigo: input.codigo,
      descricao: input.descricao,
      tipo: input.tipo,
      unidade: input.unidade,
      status: input.status ?? 'ATIVO',
      estoque_atual: input.estoque_atual ?? 0,
      estoque_reservado: input.estoque_reservado ?? 0,
      estoque_seguranca: input.estoque_seguranca ?? 0,
      lote_minimo: input.lote_minimo ?? 0,
      lead_time_dias: input.lead_time_dias ?? 0,
      custo_padrao: input.custo_padrao ?? 0,
      fornecedor_padrao_id: input.fornecedor_padrao_id ?? null,
      conversao_automatica: input.conversao_automatica ?? false,
    });
  }
}

export = CreateItemUseCase;
