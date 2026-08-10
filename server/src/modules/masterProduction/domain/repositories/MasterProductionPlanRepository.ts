import type { Transaction } from 'sequelize';

/**
 * Interface (contrato) de repositório do **Plano Mestre de Produção (MPS,
 * G17)**.
 *
 * A camada de aplicação depende apenas desta interface, nunca do Sequelize —
 * é o que permite provar a consolidação de demanda (carteira + estoque mínimo)
 * e o desconto de quarentena/reserva em teste unitário, sem banco.
 *
 * Os quatro primeiros métodos são as consultas que **não existiam** no ERP
 * antes do G17 e são a razão de ser deste módulo: ninguém lia a carteira de
 * pedidos aberta, ninguém tratava o estoque mínimo como demanda, e ninguém
 * confrontava a necessidade com o que já está em produção.
 *
 * @module modules/masterProduction/domain/repositories/MasterProductionPlanRepository
 */
class MasterProductionPlanRepository {
  /**
   * Soma a carteira de pedidos aberta por produto: `quantity -
   * invoiced_quantity` dos itens de vendas em `confirmed`/`partially_invoiced`.
   *
   * @abstract
   * @returns Mapa `product_id -> saldo aberto` (produtos sem saldo não aparecem).
   */
  async sumSalesBacklogByProduct(): Promise<Map<number, number>> {
    throw new Error('MasterProductionPlanRepository.sumSalesBacklogByProduct não implementado.');
  }

  /**
   * Soma o saldo a produzir das OPs abertas por produto:
   * `max(0, quantity - quantity_produced)` em `planned`/`released`/
   * `in_progress`/`paused`.
   *
   * @abstract
   * @returns Mapa `product_id -> saldo em produção`.
   */
  async sumOpenProductionByProduct(): Promise<Map<number, number>> {
    throw new Error('MasterProductionPlanRepository.sumOpenProductionByProduct não implementado.');
  }

  /**
   * Lista os produtos planejáveis (ativos, `finished`/`semi_finished`) que têm
   * estoque mínimo (`min_quantity > 0`) — a segunda fonte de demanda do plano.
   *
   * @abstract
   * @returns Produtos com `id`, `code`, `name`, `product_type`, `quantity`, `reserved_quantity`, `min_quantity`.
   */
  async listProductsWithSafetyStock(): Promise<any[]> {
    throw new Error('MasterProductionPlanRepository.listProductsWithSafetyStock não implementado.');
  }

  /**
   * Carrega produtos por id (para os que entraram no plano por carteira ou
   * previsão e não têm estoque mínimo cadastrado).
   *
   * @abstract
   * @param ids - Ids de produto.
   * @returns Produtos encontrados (mesmos atributos de {@link listProductsWithSafetyStock}).
   */
  async findProductsByIds(ids: Array<number | string>): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.findProductsByIds não implementado.');
  }

  /**
   * Soma o saldo retido em quarentena/bloqueio por produto (G7).
   *
   * @abstract
   * @param productIds - Ids de produto.
   * @param transaction - Transação ativa (opcional).
   * @returns Mapa `product_id -> quantidade retida`.
   */
  async sumWithheldByProduct(
    productIds: Array<number | string>, // eslint-disable-line no-unused-vars
    transaction?: Transaction // eslint-disable-line no-unused-vars
  ): Promise<Map<number, number>> {
    throw new Error('MasterProductionPlanRepository.sumWithheldByProduct não implementado.');
  }

  /**
   * Gera o próximo número de plano do ano (`MPS-YYYY-NNNN`), serializado por
   * advisory lock — mesmo padrão de `production_orders.order_number` depois do
   * G16 (`MAX`, nunca `COUNT`).
   *
   * @abstract
   * @param yearPrefix - Prefixo anual (ex.: `MPS-2026`).
   * @param transaction - Transação ativa (obrigatória para o lock).
   * @returns Próximo número completo.
   */
  async nextPlanNumberForYear(
    yearPrefix: string, // eslint-disable-line no-unused-vars
    transaction: Transaction // eslint-disable-line no-unused-vars
  ): Promise<string> {
    throw new Error('MasterProductionPlanRepository.nextPlanNumberForYear não implementado.');
  }

  /**
   * Cria o cabeçalho do plano.
   *
   * @abstract
   * @param data - Campos já validados.
   * @param transaction - Transação ativa.
   * @returns Plano criado.
   */
  async createPlan(data: Record<string, unknown>, transaction: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.createPlan não implementado.');
  }

  /**
   * Cria as linhas do plano em lote.
   *
   * @abstract
   * @param lines - Linhas já consolidadas.
   * @param transaction - Transação ativa.
   * @returns Linhas criadas.
   */
  async createPlanLines(lines: Array<Record<string, unknown>>, transaction: Transaction): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.createPlanLines não implementado.');
  }

  /**
   * Busca um plano com as linhas e o produto de cada linha.
   *
   * @abstract
   * @param id - Id do plano.
   * @returns Plano com `lines` ou `null`.
   */
  async findPlanById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.findPlanById não implementado.');
  }

  /**
   * Busca um plano **sem includes** (cabeçalho puro) — usado por caminhos que
   * só precisam do status, como a edição de linha.
   *
   * @abstract
   * @param id - Id do plano.
   * @returns Plano ou `null`.
   */
  async findPlanByIdRaw(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.findPlanByIdRaw não implementado.');
  }

  /**
   * Busca um plano com lock pessimista, para transição de status.
   *
   * @abstract
   * @param id - Id do plano.
   * @param transaction - Transação ativa.
   * @returns Plano travado ou `null`.
   */
  async findPlanByIdForUpdate(id: number | string, transaction: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.findPlanByIdForUpdate não implementado.');
  }

  /**
   * Lista planos com filtros e paginação.
   *
   * @abstract
   * @param where - Filtro (`status`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listPlans(
    where?: Record<string, unknown>, // eslint-disable-line no-unused-vars
    pagination?: { limit?: number; offset?: number } // eslint-disable-line no-unused-vars
  ): Promise<{ rows: any[]; count: number }> {
    throw new Error('MasterProductionPlanRepository.listPlans não implementado.');
  }

  /**
   * Atualiza o cabeçalho do plano.
   *
   * @abstract
   * @param id - Id do plano.
   * @param data - Campos a atualizar.
   * @param transaction - Transação ativa.
   * @returns Linhas afetadas.
   */
  async updatePlan(
    id: number | string, // eslint-disable-line no-unused-vars
    data: Record<string, unknown>, // eslint-disable-line no-unused-vars
    transaction: Transaction // eslint-disable-line no-unused-vars
  ): Promise<number> {
    throw new Error('MasterProductionPlanRepository.updatePlan não implementado.');
  }

  /**
   * Busca uma linha do plano pelo id.
   *
   * @abstract
   * @param lineId - Id da linha.
   * @param transaction - Transação ativa (opcional).
   * @returns Linha ou `null`.
   */
  async findLineById(lineId: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.findLineById não implementado.');
  }

  /**
   * Lista as linhas de um plano (com o produto), opcionalmente travadas.
   *
   * @abstract
   * @param planId - Id do plano.
   * @param transaction - Transação ativa (opcional).
   * @returns Linhas do plano.
   */
  async listLinesByPlan(planId: number | string, transaction?: Transaction): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('MasterProductionPlanRepository.listLinesByPlan não implementado.');
  }

  /**
   * Atualiza uma linha do plano.
   *
   * @abstract
   * @param lineId - Id da linha.
   * @param data - Campos a atualizar.
   * @param transaction - Transação ativa (opcional).
   * @returns Linha atualizada ou `null`.
   */
  async updateLine(
    lineId: number | string, // eslint-disable-line no-unused-vars
    data: Record<string, unknown>, // eslint-disable-line no-unused-vars
    transaction?: Transaction // eslint-disable-line no-unused-vars
  ): Promise<any | null> {
    throw new Error('MasterProductionPlanRepository.updateLine não implementado.');
  }
}

export = MasterProductionPlanRepository;
