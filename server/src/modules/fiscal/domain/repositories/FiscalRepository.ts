import type { Transaction, LOCK } from 'sequelize';

/**
 * Opções de leitura repassadas ao Sequelize (transação em andamento e/ou
 * lock pessimista). Usadas pelos métodos que participam de transações
 * `sequelize.transaction(...)` já existentes nos use cases (emissão/
 * cancelamento/consulta de NF-e de venda), preservando exatamente o mesmo
 * comportamento de lock que existia antes da extração para repository.
 */
interface FindOptions {
  transaction?: Transaction;
  lock?: boolean | LOCK | undefined;
}

/**
 * Interface (contrato) de repositório do módulo `fiscal`.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/PostgreSQL.
 *
 * Cobre a configuração fiscal da empresa (`CompanyFiscalConfig`, singleton
 * id=1, dono natural deste módulo) e leituras pontuais cross-module de
 * `Purchase` (dono real: módulo `purchases`), `Sale`/`SaleItem` (dono real:
 * módulo `sales`), `Client` (dono real: módulo `sales`/`clients`) e
 * `Product` (dono real: módulo `products`) usadas por
 * `RegisterIncomingNfeUseCase`, `IssueSaleNfeUseCase`,
 * `GetSaleNfeStatusUseCase` e `CancelSaleNfeUseCase` para orquestrar a
 * emissão/consulta/cancelamento de NF-e — o `FiscalRepository` NÃO assume a
 * posse desses models, apenas expõe o acesso pontual que os use cases
 * precisam.
 */
class FiscalRepository {
  /**
   * Busca a configuração fiscal da empresa (singleton, id=1).
   *
   * @abstract
   * @param {FindOptions} [options] - Transação/lock opcionais (uso dentro de `sequelize.transaction`).
   * @returns {Promise<Object|null>}
   */
  async findCompanyFiscalConfig(options?: FindOptions): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.findCompanyFiscalConfig não implementado.');
  }

  /**
   * Cria (se ainda não existir) ou atualiza a configuração fiscal da
   * empresa (singleton, id=1).
   *
   * @abstract
   * @param {Object} data - Campos permitidos a criar/atualizar.
   * @returns {Promise<Object>} A configuração fiscal criada ou atualizada.
   */
  async upsertCompanyFiscalConfig(data: Record<string, unknown>): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.upsertCompanyFiscalConfig não implementado.');
  }

  /**
   * Busca um pedido de compra pelo id (leitura cross-module pontual — o
   * model `Purchase` pertence ao módulo `purchases`, não a `fiscal`).
   *
   * @abstract
   * @param {number|string} purchaseId
   * @returns {Promise<Object|null>}
   */
  async findPurchaseById(purchaseId: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.findPurchaseById não implementado.');
  }

  /**
   * Busca uma venda pelo id (leitura cross-module — o model `Sale`
   * pertence ao módulo `sales`, não a `fiscal`).
   *
   * @abstract
   * @param {number|string} saleId
   * @param {FindOptions} [options] - Transação/lock opcionais.
   * @returns {Promise<Object|null>}
   */
  async findSaleById(saleId: number | string, options?: FindOptions): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.findSaleById não implementado.');
  }

  /**
   * Busca os itens de uma venda (leitura cross-module — o model
   * `SaleItem` pertence ao módulo `sales`, não a `fiscal`).
   *
   * @abstract
   * @param {number|string} saleId
   * @param {FindOptions} [options] - Transação/lock opcionais.
   * @returns {Promise<Object[]>}
   */
  async findSaleItemsBySaleId(saleId: number | string, options?: FindOptions): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.findSaleItemsBySaleId não implementado.');
  }

  /**
   * Busca um cliente pelo id (leitura cross-module — o model `Client`
   * pertence ao módulo `sales`/`clients`, não a `fiscal`).
   *
   * @abstract
   * @param {number|string} clientId
   * @param {FindOptions} [options] - Transação/lock opcionais.
   * @returns {Promise<Object|null>}
   */
  async findClientById(clientId: number | string, options?: FindOptions): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.findClientById não implementado.');
  }

  /**
   * Busca produtos pelos ids (leitura cross-module — o model `Product`
   * pertence ao módulo `products`, não a `fiscal`).
   *
   * @abstract
   * @param {Array<number|string>} productIds
   * @param {FindOptions} [options] - Transação/lock opcionais.
   * @returns {Promise<Object[]>}
   */
  async findProductsByIds(productIds: Array<number | string>, options?: FindOptions): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('FiscalRepository.findProductsByIds não implementado.');
  }
}

export = FiscalRepository;
