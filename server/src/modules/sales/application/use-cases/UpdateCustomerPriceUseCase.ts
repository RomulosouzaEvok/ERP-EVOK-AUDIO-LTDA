const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, ConflictError } = require('../../../../errors');
const CreateCustomerPriceUseCase = require('./CreateCustomerPriceUseCase');

/**
 * Atualiza um preço existente na tabela de preços de um cliente (gap 1/3 do
 * módulo `sales`), cobrindo `PUT /api/sales/customers/:id/prices/:priceId`.
 */
class UpdateCustomerPriceUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository: any) {
    super();
    this.saleRepository = saleRepository;
    // Reaproveita a checagem de sobreposição de vigência sem duplicar a lógica.
    this._overlapChecker = new CreateCustomerPriceUseCase(saleRepository);
  }

  /**
   * @param {Object} input
   * @param {number} input.customerId
   * @param {number} input.priceId
   * @param {number} [input.unitPrice]
   * @param {string} [input.currency]
   * @param {string|null} [input.validFrom]
   * @param {string|null} [input.validUntil]
   * @returns {Promise<Object>}
   * @throws {NotFoundError} Se o preço não existir ou não pertencer ao cliente informado.
   * @throws {ValidationError} Se a vigência for inconsistente.
   * @throws {ConflictError} Se a nova vigência sobrepuser outro preço ativo do mesmo par cliente×produto.
   */
  async execute({ customerId, priceId, unitPrice, currency, validFrom, validUntil }: {
    customerId: number;
    priceId: number;
    unitPrice?: number;
    currency?: string;
    validFrom?: string | null;
    validUntil?: string | null;
  }) {
    const price = await this.saleRepository.findCustomerPriceById(priceId);
    if (!price || price.customer_id !== Number(customerId)) {
      throw new NotFoundError('Preço não encontrado para este cliente');
    }

    const nextValidFrom = validFrom !== undefined ? validFrom : price.valid_from;
    const nextValidUntil = validUntil !== undefined ? validUntil : price.valid_until;

    if (nextValidFrom && nextValidUntil && new Date(nextValidUntil) < new Date(nextValidFrom)) {
      throw new ValidationError('Data de fim da vigência não pode ser anterior à data de início.');
    }

    if (price.active) {
      const overlapping = await this._overlapChecker._findOverlap(customerId, price.product_id, nextValidFrom, nextValidUntil, priceId);
      if (overlapping) {
        throw new ConflictError(
          `Já existe um preço ativo para este cliente/produto com vigência sobreposta (id ${overlapping.id}).`
        );
      }
    }

    if (unitPrice !== undefined) price.unit_price = unitPrice;
    if (currency !== undefined) price.currency = currency;
    if (validFrom !== undefined) price.valid_from = validFrom;
    if (validUntil !== undefined) price.valid_until = validUntil;

    await price.save();
    return price;
  }
}

module.exports = UpdateCustomerPriceUseCase;
