const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Desativa (soft delete via `active = false`) um preço da tabela de preços
 * de um cliente (gap 1/3 do módulo `sales`), cobrindo
 * `DELETE /api/sales/customers/:id/prices/:priceId`. Nunca remove a linha
 * fisicamente — preserva histórico para auditoria (mesmo padrão de
 * `Category.active`/`ItemSupplier.active`, ver CLAUDE.md §7).
 */
class DeactivateCustomerPriceUseCase extends UseCase {
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
   * @param {number} input.priceId
   * @returns {Promise<Object>} O preço desativado.
   * @throws {NotFoundError} Se o preço não existir ou não pertencer ao cliente informado.
   */
  async execute({ customerId, priceId }: { customerId: number; priceId: number }) {
    const price = await this.saleRepository.findCustomerPriceById(priceId);
    if (!price || price.customer_id !== Number(customerId)) {
      throw new NotFoundError('Preço não encontrado para este cliente');
    }

    price.active = false;
    await price.save();
    return price;
  }
}

module.exports = DeactivateCustomerPriceUseCase;
