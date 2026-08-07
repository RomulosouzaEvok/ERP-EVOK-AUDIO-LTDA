/** Filtros e paginação genéricos aceitos por `listCostCenters`. */
type CostCenterFilters = { active?: boolean };
/** Paginação `{ limit, offset }` aceita por `listCostCenters`. */
type CostCenterPagination = { limit?: number; offset?: number };

/** Uma linha agregada (aberto/realizado) por dimensão de centro de custo, no relatório. */
export interface CostCenterReportRow {
  cost_center_id: number | null;
  code: string | null;
  name: string | null;
  receivable_open: number;
  receivable_realized: number;
  payable_open: number;
  payable_realized: number;
}

/**
 * Formato estrutural do contrato `CostCenterRepository`, usado pelos use
 * cases da camada de aplicação para tipar a dependência sem acoplar à
 * classe concreta (nominal) — qualquer objeto com esta forma (ex.:
 * `SequelizeCostCenterRepository`) satisfaz o tipo.
 */
export interface ICostCenterRepository {
  listCostCenters(filters: CostCenterFilters, pagination: CostCenterPagination): Promise<{ rows: any[]; count: number }>;
  findCostCenterById(id: number | string): Promise<any>;
  findCostCenterByCode(code: string): Promise<any>;
  createCostCenter(data: Record<string, any>): Promise<any>;
  updateCostCenter(id: number | string, data: Record<string, any>): Promise<any>;
  getCostCenterTotalsByReceivable(from: string, to: string): Promise<Array<{ cost_center_id: number | null; code: string | null; name: string | null; open_amount: number; realized_amount: number }>>;
  getCostCenterTotalsByPayable(from: string, to: string): Promise<Array<{ cost_center_id: number | null; code: string | null; name: string | null; open_amount: number; realized_amount: number }>>;
}

/**
 * Interface (contrato) de repositório de Centros de Custo (módulo
 * Financeiro).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class CostCenterRepository {
  /**
   * Lista centros de custo com filtro de `active` e paginação.
   *
   * @abstract
   * @param {Object} [filters] - `{ active }`.
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listCostCenters(filters: CostCenterFilters, pagination: CostCenterPagination) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.listCostCenters não implementado.');
  }

  /**
   * Busca um centro de custo pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findCostCenterById(id: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.findCostCenterById não implementado.');
  }

  /**
   * Busca um centro de custo pelo código (usado na checagem de unicidade).
   *
   * @abstract
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findCostCenterByCode(code: string) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.findCostCenterByCode não implementado.');
  }

  /**
   * Cria um centro de custo.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createCostCenter(data: Record<string, any>) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.createCostCenter não implementado.');
  }

  /**
   * Atualiza um centro de custo (inclusive desativação via `active: false`).
   *
   * @abstract
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async updateCostCenter(id: number | string, data: Record<string, any>) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.updateCostCenter não implementado.');
  }

  /**
   * Agrega `accounts_receivable` (não cancelada) por `cost_center_id`,
   * retornando saldo em aberto (`amount - amount_paid`, filtrado por
   * `due_date` no período `[from, to]`) e valor já realizado (`amount_paid`,
   * filtrado pela data real de pagamento `payment_date` no período — com
   * fallback para `due_date` em registros legados sem `payment_date`
   * preenchido). Correção do achado P1-1 de
   * `docs/governance/auditorias/AUDITORIA_CONT_TES_CTR_2026-08-07.md`
   * (antes, `realized` usava `due_date`, misturando vencimento com
   * pagamento efetivo).
   *
   * @abstract
   * @param {string} from - Data inicial (YYYY-MM-DD).
   * @param {string} to - Data final (YYYY-MM-DD).
   * @returns {Promise<Array>}
   */
  async getCostCenterTotalsByReceivable(from: string, to: string) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.getCostCenterTotalsByReceivable não implementado.');
  }

  /**
   * Mesma agregação e semântica de {@link getCostCenterTotalsByReceivable}, para `accounts_payable`.
   *
   * @abstract
   * @param {string} from - Data inicial (YYYY-MM-DD).
   * @param {string} to - Data final (YYYY-MM-DD).
   * @returns {Promise<Array>}
   */
  async getCostCenterTotalsByPayable(from: string, to: string) { // eslint-disable-line no-unused-vars
    throw new Error('CostCenterRepository.getCostCenterTotalsByPayable não implementado.');
  }
}

module.exports = CostCenterRepository;
