import type { Transaction } from 'sequelize';

/** Filtros e paginação genéricos aceitos pelos métodos de listagem deste repositório. */
type FinancialFilters = Record<string, any>;
/** Paginação `{ limit, offset }` aceita pelos métodos de listagem. */
type FinancialPagination = { limit?: number; offset?: number };

/**
 * Formato estrutural do contrato `FinancialRepository`, usado pelos use
 * cases da camada de aplicação para tipar a dependência sem acoplar à
 * classe concreta (nominal) — qualquer objeto com esta forma (ex.:
 * `SequelizeFinancialRepository`) satisfaz o tipo.
 */
export interface IFinancialRepository {
  listReceivables(filters: FinancialFilters, pagination: FinancialPagination): Promise<{ rows: any[]; count: number }>;
  findReceivableById(id: number | string): Promise<any>;
  findReceivableByIdForUpdate(id: number | string, transaction: Transaction): Promise<any>;
  listPayables(filters: FinancialFilters, pagination: FinancialPagination): Promise<{ rows: any[]; count: number }>;
  findPayableById(id: number | string): Promise<any>;
  findPayableByIdForUpdate(id: number | string, transaction: Transaction): Promise<any>;
  createPayable(data: Record<string, any>): Promise<any>;
  createReceivable(data: Record<string, any>): Promise<any>;
  updatePayableCostCenter(id: number | string, costCenterId: number | null): Promise<any>;
  updateReceivableCostCenter(id: number | string, costCenterId: number | null): Promise<any>;
  sumReceivableByStatus(start: Date, end: Date): Promise<Array<{ status: string; total: number }>>;
  sumPayableByStatus(start: Date, end: Date): Promise<Array<{ status: string; total: number }>>;
  getOpenTitlesForProjection(days: number): Promise<{
    receivableRows: Array<{ due_date: string; amount: number }>;
    payableRows: Array<{ due_date: string; amount: number }>;
    overdueReceivable: number;
    overduePayable: number;
  }>;
  /**
   * Lista contas a pagar vinculadas a processo jurídico (`legal_case_id IS
   * NOT NULL`) — alimenta `GET /api/jur/reports/financeiro` (RF-JUR-018/020,
   * `docs/business/BLOCO_3_JUR_API.md` §8.2), consumido via
   * `AccountPayableServiceAdapter` do módulo `juridico` (nunca Sequelize
   * direto do módulo Jurídico).
   */
  listPayablesByLegalCase(): Promise<any[]>;
}

/**
 * Interface (contrato) de repositório do módulo Financeiro (contas a
 * receber, contas a pagar e fluxo de caixa).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class FinancialRepository {
  /**
   * Lista contas a receber com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, customer_id, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listReceivables(filters: FinancialFilters, pagination: FinancialPagination) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.listReceivables não implementado.');
  }

  /**
   * Busca uma conta a receber pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findReceivableById(id: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findReceivableById não implementado.');
  }

  /**
   * Busca uma conta a receber com lock pessimista para impedir baixa dupla.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findReceivableByIdForUpdate(id: number | string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findReceivableByIdForUpdate não implementado.');
  }

  /**
   * Lista contas a pagar com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ status, start_date, end_date }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listPayables(filters: FinancialFilters, pagination: FinancialPagination) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.listPayables não implementado.');
  }

  /**
   * Busca uma conta a pagar pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findPayableById(id: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findPayableById não implementado.');
  }

  /**
   * Busca uma conta a pagar com lock pessimista para impedir pagamento duplo.
   *
   * @abstract
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findPayableByIdForUpdate(id: number | string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.findPayableByIdForUpdate não implementado.');
  }

  /**
   * Cria uma conta a pagar.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createPayable(data: Record<string, any>) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.createPayable não implementado.');
  }

  /**
   * Cria uma conta a receber **avulsa** (sem venda vinculada) — decisão
   * D-J: reembolso, aluguel e venda de sucata são cobranças legítimas sem
   * pedido de venda por trás.
   *
   * Recebível **de venda** NÃO passa por aqui: ele nasce na autorização da
   * NF-e (gap G13, CPC 47 item 108), em
   * `services/saleReceivableService.ts` via `FiscalRepository`.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createReceivable(data: Record<string, any>) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.createReceivable não implementado.');
  }

  /**
   * Atribui (ou remove, com `null`) o centro de custo de uma conta a pagar existente.
   *
   * @abstract
   * @param {number} id
   * @param {number|null} costCenterId
   * @returns {Promise<Object|null>}
   */
  async updatePayableCostCenter(id: number | string, costCenterId: number | null) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.updatePayableCostCenter não implementado.');
  }

  /**
   * Atribui (ou remove, com `null`) o centro de custo de uma conta a receber existente.
   *
   * @abstract
   * @param {number} id
   * @param {number|null} costCenterId
   * @returns {Promise<Object|null>}
   */
  async updateReceivableCostCenter(id: number | string, costCenterId: number | null) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.updateReceivableCostCenter não implementado.');
  }

  /**
   * Soma valores de contas a receber agrupados por status, em um intervalo de datas.
   *
   * @abstract
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Array<{status: string, total: number}>>}
   */
  async sumReceivableByStatus(start: Date, end: Date) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.sumReceivableByStatus não implementado.');
  }

  /**
   * Soma valores de contas a pagar agrupados por status, em um intervalo de datas.
   *
   * @abstract
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Array<{status: string, total: number}>>}
   */
  async sumPayableByStatus(start: Date, end: Date) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.sumPayableByStatus não implementado.');
  }

  /**
   * Retorna os títulos em aberto (`payment_date IS NULL` e status não
   * cancelado) de contas a receber e a pagar, dentro do horizonte
   * `[hoje, hoje + days]`, mais os títulos vencidos e não pagos (sem limite
   * de data futura) — usado na projeção de fluxo de caixa (SQL raw
   * parametrizado).
   *
   * @abstract
   * @param {number} days - Horizonte em dias a partir de hoje.
   * @returns {Promise<{
   *   receivableRows: Array<{ due_date: string, amount: number }>,
   *   payableRows: Array<{ due_date: string, amount: number }>,
   *   overdueReceivable: number,
   *   overduePayable: number
   * }>}
   */
  async getOpenTitlesForProjection(days: number) { // eslint-disable-line no-unused-vars
    throw new Error('FinancialRepository.getOpenTitlesForProjection não implementado.');
  }

  /**
   * Lista contas a pagar vinculadas a processo jurídico.
   *
   * @abstract
   * @returns {Promise<Object[]>}
   */
  async listPayablesByLegalCase() {
    throw new Error('FinancialRepository.listPayablesByLegalCase não implementado.');
  }
}

module.exports = FinancialRepository;

