const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

const MAX_BOM_LEVEL = 10;
const MAX_SCRAP_PERCENTAGE = 100;

/** Item componente de entrada para construção de uma {@link BOMEntity}. */
interface BOMEntityItemInput {
  component_product_id: number | string;
  quantity: number | string;
  scrap_percentage?: number | string;
  bom_level?: number | string;
  [key: string]: unknown;
}

/** Props aceitas pelo construtor de {@link BOMEntity}. */
interface BOMEntityProps {
  id?: number | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  product_id: number | string;
  items: BOMEntityItemInput[];
  revision?: string;
  revision_notes?: string;
  notes?: string;
}

class BOMEntity extends Entity {
  product_id: number | string;
  items: BOMEntityItemInput[] | undefined;
  revision: string | undefined;
  revision_notes: string | undefined;
  notes: string | undefined;

  constructor(props: BOMEntityProps) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.product_id = props.product_id;
    this.items = Array.isArray(props.items) ? props.items : undefined;
    this.revision = props.revision;
    this.revision_notes = props.revision_notes;
    this.notes = props.notes;

    this.validate();
  }

  validate() {
    if (!this.product_id) {
      throw new ValidationError('ID do produto e obrigatorio');
    }
    if (!this.items || this.items.length === 0) {
      throw new ValidationError('Adicione pelo menos um item componente a BOM');
    }

    const seenComponents = new Set();
    this.items.forEach((item: BOMEntityItemInput, i: number) => {
      if (!item.component_product_id) {
        throw new ValidationError(`Item ${i + 1}: component_product_id e obrigatorio`);
      }
      if (Number(item.component_product_id) === Number(this.product_id)) {
        throw new ValidationError(`Item ${i + 1}: produto nao pode ser componente dele mesmo`);
      }
      if (!item.quantity || parseFloat(String(item.quantity)) <= 0) {
        throw new ValidationError(`Item ${i + 1}: quantidade deve ser maior que zero`);
      }

      const scrap = item.scrap_percentage !== undefined ? Number(item.scrap_percentage) : 0;
      if (!Number.isFinite(scrap) || scrap < 0 || scrap > MAX_SCRAP_PERCENTAGE) {
        throw new ValidationError(`Item ${i + 1}: percentual de perda deve ficar entre 0 e ${MAX_SCRAP_PERCENTAGE}`);
      }

      const level = item.bom_level !== undefined ? Number(item.bom_level) : 1;
      if (!Number.isInteger(level) || level < 1 || level > MAX_BOM_LEVEL) {
        throw new ValidationError(`Item ${i + 1}: nivel da BOM deve ficar entre 1 e ${MAX_BOM_LEVEL}`);
      }

      const duplicateKey = `${level}:${item.component_product_id}`;
      if (seenComponents.has(duplicateKey)) {
        throw new ValidationError(`Item ${i + 1}: componente duplicado no mesmo nivel da BOM`);
      }
      seenComponents.add(duplicateKey);
    });
  }

  toServiceInput(createdBy: number | string | undefined) {
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


