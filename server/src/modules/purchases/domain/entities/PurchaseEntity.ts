const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

interface PurchaseEntityItemInput {
  product_id: number | string;
  quantity: number | string;
  unit_price: number | string;
}

interface PurchaseEntityProps {
  id?: number | string;
  supplier_id: number | string;
  items: PurchaseEntityItemInput[];
  notes?: string;
  expected_date?: string | Date;
  /** G11 — origem declarada da compra (`national` quando omitida). */
  origin?: string | null;
}

/**
 * Entidade de domínio leve que representa um Pedido de Compra (Purchase
 * Order) na criação.
 *
 * Valida apenas a FORMA dos dados de entrada (fornecedor obrigatório, lista
 * de itens não vazia, cada item com `product_id`/`quantity`/`unit_price`
 * válidos). Regras de negócio mais pesadas — existência real do produto no
 * banco, cálculo do total do pedido, geração de `AccountPayable` na
 * aprovação — permanecem nos use cases/repositório, exatamente como no
 * controller anterior `server/src/controllers/purchaseController.ts`, para
 * preservar 100% do comportamento já em produção.
 */
class PurchaseEntity extends Entity {
  /**
   * @param {Object} props
   * @param {number} [props.id]
   * @param {number} props.supplier_id - Id do fornecedor (obrigatório).
   * @param {Array<{product_id:number, quantity:number, unit_price:number}>} props.items - Itens do pedido (obrigatório, não vazio).
   * @param {string} [props.notes]
   * @param {string|Date} [props.expected_date]
   * @throws {ValidationError} Se `supplier_id` ausente, `items` vazio/ausente, ou algum item inválido.
   */
  public supplier_id: number | string;
  public items: PurchaseEntityItemInput[];
  public notes: string | null;
  public expected_date: string | Date | null;
  /**
   * G11 — origem declarada da compra. Normalizada para `'national'` quando
   * ausente: `purchase_orders.origin` é `NOT NULL DEFAULT 'national'` e
   * gravar `null` explícito anularia o DEFAULT do Postgres. Note que
   * declarar `'national'` NÃO garante que o pedido seja tratado como
   * nacional na alçada — `suppliers.is_foreign` prevalece
   * (`domain/constants.ts`).
   */
  public origin: 'national' | 'import';

  constructor(props: PurchaseEntityProps) {
    super({ id: props.id });
    this.supplier_id = props.supplier_id;
    this.items = props.items;
    this.notes = props.notes ?? null;
    this.expected_date = props.expected_date ?? null;
    // Valor invalido NAO e silenciosamente rebaixado para 'national' (isso
    // seria exatamente o caminho para escapar da alcada por engano de
    // digitacao) — `validate()` rejeita qualquer coisa fora do enum.
    if (props.origin === undefined || props.origin === null) {
      this.origin = 'national';
    } else {
      this.origin = props.origin as 'national' | 'import';
    }

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou inválido.
   */
  validate() {
    if (!this.supplier_id) {
      throw new ValidationError('Fornecedor é obrigatório.');
    }
    if (!this.items || this.items.length === 0) {
      throw new ValidationError('Adicione pelo menos um item.');
    }
    if (this.origin !== 'national' && this.origin !== 'import') {
      throw new ValidationError('Origem do pedido deve ser "national" ou "import".');
    }
    for (const item of this.items) {
      if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) {
        throw new ValidationError('Cada item deve ter product_id, quantity e unit_price.');
      }
      const qty = parseFloat(String(item.quantity));
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero.');
      }
      const unitPrice = parseFloat(String(item.unit_price));
      if (Number.isNaN(unitPrice) || unitPrice <= 0) {
        throw new ValidationError('Preço unitário deve ser maior que zero.');
      }
    }
  }
}

module.exports = PurchaseEntity;


