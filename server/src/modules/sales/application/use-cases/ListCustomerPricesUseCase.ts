const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Lista os preços cadastrados na tabela de preços de um cliente (gap 1/3 do
 * módulo `sales` — `docs/LEVANTAMENTO_ERP_2026-08-02.md`, linha `sales`),
 * cobrindo `GET /api/sales/customers/:id/prices`.
 */
class ListCustomerPricesUseCase extends UseCase {
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
   * @param {number} [input.productId] - Filtra apenas o preço de um produto específico.
   * @param {boolean} [input.activeOnly=false]
   * @returns {Promise<Object[]>}
   * @throws {NotFoundError} Se o cliente não existir.
   */
  async execute({ customerId, productId, activeOnly = false }: { customerId: number; productId?: number; activeOnly?: boolean }) {
    const customer = await this.saleRepository.findClientById(customerId);
    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return this.saleRepository.listCustomerPrices(customerId, { product_id: productId, active_only: activeOnly });
  }
}

module.exports = ListCustomerPricesUseCase;
