import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';

/**
 * Caso de uso da criacao de estrutura pelo cadastro de item.
 *
 * **Encerrado no G1 (2026-08-10).** Este caminho gravava em
 * `item_estruturas` — a segunda arvore de produto do ERP, cujo mestre
 * (`items`, UUID) nao e o mestre que a producao consome e custeia
 * (`products`, INTEGER). Depois do G1 a estrutura tem fonte unica: a BOM
 * ativa (`bill_of_materials`), lida tanto pelo MRP quanto pela liberacao,
 * consumo e custeio da OP.
 *
 * Manter a gravacao aqui seria pior do que recusa-la: o usuario cadastrava
 * a arvore, recebia 201, e a producao continuava sem enxergar nada — que e
 * literalmente o defeito que o G1 fecha. Por isso o caminho recusa com 422 e
 * aponta para onde a estrutura deve ser cadastrada, em vez de aceitar em
 * silencio.
 *
 * As validacoes anteriores (item pai/componente existem, sem auto-referencia,
 * sem ciclo) continuam sendo executadas ANTES da recusa: um payload
 * estruturalmente invalido deve continuar recebendo o erro que descreve o
 * problema real dele, e nao um aviso de rota descontinuada que esconderia o
 * dado ruim.
 */
class CreateItemStructureUseCase extends UseCase<Record<string, any>, any> {
  private readonly itemRepository: ItemRepository;
  private readonly itemEstruturaRepository: ItemEstruturaRepository;

  public constructor(itemRepository: ItemRepository, itemEstruturaRepository: ItemEstruturaRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemEstruturaRepository = itemEstruturaRepository;
  }

  /**
   * Valida o payload e recusa a gravacao em estrutura paralela.
   *
   * @param input - Ligacao pai/componente pretendida.
   * @throws {NotFoundError} Se o item pai ou o componente nao existir.
   * @throws {BusinessRuleError} `G1-ESTRUTURA-AUTO-REF` se pai e componente
   *   forem o mesmo item; `G1-ESTRUTURA-CICLO` se a ligacao fechar ciclo na
   *   estrutura vigente; `G1-ESTRUTURA-DUPLA` em qualquer payload valido,
   *   redirecionando o cadastro para o modulo de BOM.
   */
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
      throw new BusinessRuleError('Item pai nao pode ser igual ao componente.', {
        rule: 'G1-ESTRUTURA-AUTO-REF',
        item_pai_id: input.item_pai_id,
        item_componente_id: input.item_componente_id,
      });
    }

    const createsCycle = await this.itemEstruturaRepository.hasPathBetween(
      String(input.item_componente_id),
      String(input.item_pai_id),
    );
    if (createsCycle) {
      throw new BusinessRuleError('Ciclo detectado na estrutura.', {
        rule: 'G1-ESTRUTURA-CICLO',
        item_pai_id: input.item_pai_id,
        item_componente_id: input.item_componente_id,
      });
    }

    throw new BusinessRuleError(
      'A estrutura de produto passou a ter fonte unica: a BOM ativa do produto. '
      + `Cadastre o componente "${component.codigo ?? input.item_componente_id}" na estrutura de `
      + `"${parent.codigo ?? input.item_pai_id}" pelo modulo de BOM (Producao > Estrutura de produto). `
      + 'Gravar aqui criaria uma segunda arvore que o MRP e a producao nao leem — foi exatamente esse '
      + 'descasamento que o gap G1 fechou.',
      {
        rule: 'G1-ESTRUTURA-DUPLA',
        item_pai_id: input.item_pai_id,
        item_componente_id: input.item_componente_id,
        origem_unica: 'bill_of_materials',
        endpoint_correto: 'POST /api/engineering/bom',
      },
    );
  }
}

export = CreateItemStructureUseCase;
