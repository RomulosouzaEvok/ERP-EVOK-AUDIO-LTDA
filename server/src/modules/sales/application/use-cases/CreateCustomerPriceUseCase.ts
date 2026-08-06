const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, ConflictError } = require('../../../../errors');

/**
 * Cria um preço na tabela de preços de um cliente (gap 1/3 do módulo
 * `sales`), cobrindo `POST /api/sales/customers/:id/prices`.
 *
 * Não impõe que a venda use exatamente este preço — o vendedor sempre pode
 * sobrescrever `unit_price` manualmente ao montar o pedido
 * (`CreateSaleUseCase`/`EditSaleItemsUseCase` não leem esta tabela; a
 * sugestão de preço acontece na camada de apresentação/frontend, que
 * consulta `GET .../prices` ao montar o item do pedido).
 */
class CreateCustomerPriceUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository: any) {
    super();
    this.saleRepository = saleRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.customerId
   * @param {number} input.productId
   * @param {number} input.unitPrice
   * @param {string} [input.currency='BRL']
   * @param {string} [input.validFrom] - Data ISO (YYYY-MM-DD), início da vigência.
   * @param {string} [input.validUntil] - Data ISO (YYYY-MM-DD), fim da vigência.
   * @param {number} input.userId - Id de quem está cadastrando o preço.
   * @returns {Promise<Object>}
   * @throws {NotFoundError} Se cliente ou produto não existirem.
   * @throws {ValidationError} Se `validUntil` for anterior a `validFrom`.
   * @throws {ConflictError} Se já existir um preço ativo com vigência sobreposta para o mesmo par cliente×produto.
   */
  async execute({ customerId, productId, unitPrice, currency = 'BRL', validFrom, validUntil, userId }: {
    customerId: number;
    productId: number;
    unitPrice: number;
    currency?: string;
    validFrom?: string | null;
    validUntil?: string | null;
    userId: number;
  }) {
    const customer = await this.saleRepository.findClientById(customerId);
    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    const product = await this.saleRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError(`Produto ID ${productId} não encontrado`);
    }

    if (validFrom && validUntil && new Date(validUntil) < new Date(validFrom)) {
      throw new ValidationError('Data de fim da vigência não pode ser anterior à data de início.');
    }

    const overlapping = await this._findOverlap(customerId, productId, validFrom, validUntil);
    if (overlapping) {
      throw new ConflictError(
        `Já existe um preço ativo para este cliente/produto com vigência sobreposta (id ${overlapping.id}).`
      );
    }

    return this.saleRepository.createCustomerPrice({
      customer_id: customerId,
      product_id: productId,
      unit_price: unitPrice,
      currency,
      valid_from: validFrom ?? null,
      valid_until: validUntil ?? null,
      active: true,
      created_by: userId
    });
  }

  /**
   * Verifica se algum preço ativo do par cliente×produto tem vigência que
   * se sobrepõe ao intervalo informado (comparação em memória — o volume de
   * preços por cliente/produto é sempre baixo, não justifica uma query SQL
   * de sobreposição de intervalos).
   *
   * @param {number} customerId
   * @param {number} productId
   * @param {string} [validFrom]
   * @param {string} [validUntil]
   * @param {number} [excludeId]
   * @returns {Promise<Object|null>}
   */
  async _findOverlap(customerId: number, productId: number, validFrom?: string | null, validUntil?: string | null, excludeId?: number) {
    const existing = await this.saleRepository.listActiveCustomerPricesForProduct(customerId, productId, excludeId);
    const newFrom = validFrom ? new Date(validFrom) : null;
    const newUntil = validUntil ? new Date(validUntil) : null;

    return existing.find((price: any) => {
      const existingFrom = price.valid_from ? new Date(price.valid_from) : null;
      const existingUntil = price.valid_until ? new Date(price.valid_until) : null;

      const startsBeforeExistingEnds = !existingUntil || !newFrom || newFrom <= existingUntil;
      const endsAfterExistingStarts = !existingFrom || !newUntil || newUntil >= existingFrom;
      return startsBeforeExistingEnds && endsAfterExistingStarts;
    }) || null;
  }
}

module.exports = CreateCustomerPriceUseCase;
