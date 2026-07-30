import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';
const { sequelize } = require('../../../../models/index');

/**
 * Caso de uso para criar estrutura canonica de item.
 */
class CreateItemStructureUseCase extends UseCase<Record<string, any>, any> {
  private readonly itemRepository: ItemRepository;
  private readonly itemEstruturaRepository: ItemEstruturaRepository;

  public constructor(itemRepository: ItemRepository, itemEstruturaRepository: ItemEstruturaRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemEstruturaRepository = itemEstruturaRepository;
  }

  /** Cria uma ligacao pai-componente com bloqueio de ciclo. */
  public async execute(input: Record<string, any>): Promise<any> {
    const parent = await this.itemRepository.findById(String(input.item_pai_id));
    if (!parent) {
      throw new NotFoundError('Item pai nao encontrado.');
    }

    const component = await this.itemRepository.findById(String(input.item_componente_id));
    if (!component) {
      throw new NotFoundError('Item componente nao encontrado.');
    }

    if (String(input.item_pai_id) === String(input.item_componente_id)) {
      throw new BusinessRuleError('Item pai nao pode ser igual ao componente.');
    }

    const createsCycle = await this.itemEstruturaRepository.hasPathBetween(
      String(input.item_componente_id),
      String(input.item_pai_id),
    );
    if (createsCycle) {
      throw new BusinessRuleError('Ciclo detectado na estrutura.', {
        item_pai_id: input.item_pai_id,
        item_componente_id: input.item_componente_id,
      });
    }

    return sequelize.transaction(async (transaction: any) => this.itemEstruturaRepository.create({
      item_pai_id: input.item_pai_id,
      item_componente_id: input.item_componente_id,
      quantidade: input.quantidade,
      perda_percentual: input.perda_percentual ?? 0,
      nivel: input.nivel ?? 1,
      sequencia: input.sequencia ?? 0,
      ativo: input.ativo ?? true,
      revisao: input.revisao ?? '00',
      observacoes: input.observacoes ?? null,
      criado_por: input.criado_por ?? null,
    }, transaction));
  }
}

export = CreateItemStructureUseCase;
