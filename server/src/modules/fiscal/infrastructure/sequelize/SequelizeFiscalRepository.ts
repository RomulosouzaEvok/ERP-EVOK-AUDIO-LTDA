/**
 * Implementação Sequelize do repositório do módulo `fiscal`.
 *
 * @module modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository
 */

const FiscalRepository = require('../../domain/repositories/FiscalRepository');
const { CompanyFiscalConfig, Purchase, Sale, SaleItem, Client, Product } = require('../../../../models/index');

interface FindOptions {
  transaction?: any;
  lock?: any;
}

class SequelizeFiscalRepository extends FiscalRepository {
  /** @inheritdoc */
  async findCompanyFiscalConfig(options?: FindOptions) {
    return CompanyFiscalConfig.findByPk(1, options);
  }

  /**
   * @inheritdoc
   * `data` já vem filtrada para os campos permitidos pelo use case
   * (`UpsertCompanyFiscalConfigUseCase`) — este método só persiste.
   */
  async upsertCompanyFiscalConfig(data: Record<string, unknown>) {
    const existing = await CompanyFiscalConfig.findByPk(1);
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return existing;
    }

    return CompanyFiscalConfig.create({ id: 1, ...data });
  }

  /** @inheritdoc */
  async findPurchaseById(purchaseId: number | string) {
    return Purchase.findByPk(purchaseId);
  }

  /** @inheritdoc */
  async findSaleById(saleId: number | string, options?: FindOptions) {
    return Sale.findByPk(saleId, options);
  }

  /** @inheritdoc */
  async findSaleItemsBySaleId(saleId: number | string, options?: FindOptions) {
    return SaleItem.findAll({ where: { sale_id: saleId }, ...options });
  }

  /** @inheritdoc */
  async findClientById(clientId: number | string, options?: FindOptions) {
    return Client.findByPk(clientId, options);
  }

  /** @inheritdoc */
  async findProductsByIds(productIds: Array<number | string>, options?: FindOptions) {
    return Product.findAll({ where: { id: productIds }, ...options });
  }
}

module.exports = SequelizeFiscalRepository;
