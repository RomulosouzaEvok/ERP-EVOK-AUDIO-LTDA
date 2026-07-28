const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/**
 * Entidade de domínio leve que representa a Estrutura de Produto (BOM –
 * Bill of Materials) na entrada de criação via `POST /api/engineering/bom`.
 *
 * Esta entidade valida apenas a FORMA dos dados de entrada (produto
 * informado, lista de itens não vazia, cada item com componente e
 * quantidade > 0). Toda a lógica de negócio pesada — produto deve ser do
 * tipo `finished`, componente deve existir, versionamento automático via
 * `status = 'superseded'` das BOMs ativas anteriores, cálculo de custo por
 * item — permanece 100% em `server/src/services/bomService.js`
 * (`BomService.createBOM`), não duplicada aqui.
 */
class BOMEntity extends Entity {
  /**
   * @param {Object} props - Propriedades da BOM.
   * @param {number} [props.id] - Identificador único (quando já persistida).
   * @param {number} props.product_id - Id do produto acabado ao qual a BOM pertence.
   * @param {Array<Object>} props.items - Lista de itens componentes.
   * @param {number} props.items[].component_product_id - Id do produto componente.
   * @param {number} props.items[].quantity - Quantidade do componente por unidade do produto (deve ser > 0).
   * @param {string} [props.revision] - Revisão da BOM.
   * @param {string} [props.revision_notes] - Notas da revisão.
   * @param {string} [props.notes] - Observações técnicas.
   * @param {Date|string} [props.createdAt]
   * @param {Date|string} [props.updatedAt]
   * @throws {ValidationError} Se `product_id` estiver ausente, `items` estiver vazio/ausente
   * ou algum item não tiver `component_product_id`/`quantity` válidos.
   */
  constructor(props) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.product_id = props.product_id;
    this.items = Array.isArray(props.items) ? props.items : undefined;
    this.revision = props.revision;
    this.revision_notes = props.revision_notes;
    this.notes = props.notes;

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou inválido.
   */
  validate() {
    if (!this.product_id) {
      throw new ValidationError('ID do produto é obrigatório');
    }
    if (!this.items || this.items.length === 0) {
      throw new ValidationError('Adicione pelo menos um item componente à BOM');
    }
    this.items.forEach((item, i) => {
      if (!item.component_product_id) {
        throw new ValidationError(`Item ${i + 1}: component_product_id é obrigatório`);
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        throw new ValidationError(`Item ${i + 1}: quantidade deve ser maior que zero`);
      }
    });
  }

  /**
   * Serializa a entidade para os parâmetros aceitos por `BomService.createBOM`.
   *
   * @param {number} createdBy - Id do usuário que está criando a BOM.
   * @returns {{ product_id: number, created_by: number, items: Array<Object>, revision: string|undefined, revision_notes: string|undefined, notes: string|undefined }}
   */
  toServiceInput(createdBy) {
    return {
      product_id: this.product_id,
      created_by: createdBy,
      items: this.items,
      revision: this.revision,
      revision_notes: this.revision_notes,
      notes: this.notes
    };
  }
}

module.exports = BOMEntity;
