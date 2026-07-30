import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';
import { explodeBomRequirements } from '../../../mrp/application/mrpEngine';

/**
 * Caso de uso para explodir estrutura canonica com agregacao.
 */
class ExplodeItemStructureUseCase extends UseCase<Record<string, any>, any> {
  private readonly itemRepository: ItemRepository;
  private readonly itemEstruturaRepository: ItemEstruturaRepository;

  public constructor(itemRepository: ItemRepository, itemEstruturaRepository: ItemEstruturaRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemEstruturaRepository = itemEstruturaRepository;
  }

  /** Explode a estrutura ativa do item informado. */
  public async execute(input: Record<string, any>): Promise<any> {
    const item = await this.itemRepository.findById(String(input.itemId));
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    const quantity = Number(input.quantity);
    const dueDate = input.dueDate ? new Date(String(input.dueDate)) : new Date();
    const edges = await this.itemEstruturaRepository.listActiveEdges();

    const exploded = explodeBomRequirements(
      String(item.id),
      quantity,
      dueDate,
      edges.map((edge: any) => ({
        parentItemId: String(edge.item_pai_id),
        componentItemId: String(edge.item_componente_id),
        quantityPer: Number(edge.quantidade),
        scrapPercentage: Number(edge.perda_percentual ?? 0),
        active: Boolean(edge.ativo),
      })),
    );

    const itemIds = [...new Set(exploded.map((entry) => entry.itemId))];
    const items = await Promise.all(itemIds.map((itemId) => this.itemRepository.findById(itemId)));
    const itemsById = new Map(items.filter(Boolean).map((entry: any) => [String(entry.id), entry]));

    return exploded.map((entry) => ({
      item_id: entry.itemId,
      codigo: itemsById.get(entry.itemId)?.codigo ?? null,
      descricao: itemsById.get(entry.itemId)?.descricao ?? null,
      quantidade_bruta: entry.grossRequirement,
      nivel: entry.level,
      data_necessidade: entry.dueDate,
    }));
  }
}

export = ExplodeItemStructureUseCase;
