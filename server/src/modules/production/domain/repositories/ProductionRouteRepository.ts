/**
 * Contrato de repositorio do Roteiro de Producao (gap G5).
 *
 * A camada de aplicacao (use cases) depende APENAS desta interface — nunca
 * do Sequelize. Implementado por
 * {@link SequelizeProductionRouteRepository} na camada de infraestrutura.
 *
 * @module modules/production/domain/repositories/ProductionRouteRepository
 */

class ProductionRouteRepository {
  /**
   * Lista roteiros com filtros e paginacao (cabecalho + produto, sem etapas).
   *
   * @abstract
   * @param filters - `{ product_id, status, route_code, search }`.
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listRoutes(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('ProductionRouteRepository.listRoutes nao implementado.');
  }

  /**
   * Busca um roteiro por id COM etapas (ordenadas por `sequence`), produto,
   * item e centro de trabalho de cada etapa.
   *
   * @abstract
   * @param id - Id do roteiro.
   * @returns Roteiro ou `null`.
   */
  async findRouteById(_id: number): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findRouteById nao implementado.');
  }

  /**
   * Busca um roteiro "cru" (sem includes), opcionalmente dentro de uma transacao.
   *
   * @abstract
   * @param id - Id do roteiro.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Roteiro ou `null`.
   */
  async findRouteByIdRaw(_id: number, _transaction?: any): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findRouteByIdRaw nao implementado.');
  }

  /**
   * Busca um roteiro "cru" com lock pessimista, para serializar ativacao e
   * edicao concorrentes do mesmo roteiro.
   *
   * @abstract
   * @param id - Id do roteiro.
   * @param transaction - Transacao Sequelize ativa (obrigatoria).
   * @returns Roteiro ou `null`.
   */
  async findRouteByIdForUpdate(_id: number, _transaction: any): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findRouteByIdForUpdate nao implementado.');
  }

  /**
   * Busca um roteiro pelo `route_code` (unico global).
   *
   * @abstract
   * @param routeCode - Codigo do roteiro, ja normalizado.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Roteiro ou `null`.
   */
  async findRouteByCode(_routeCode: string, _transaction?: any): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findRouteByCode nao implementado.');
  }

  /**
   * Busca o roteiro de um produto em uma revisao especifica (par unico no
   * banco: indice unico `(product_id, revision)`).
   *
   * @abstract
   * @param productId - Id do produto legado (`products.id`).
   * @param revision - Revisao (ex.: `'00'`, `'01'`).
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Roteiro ou `null`.
   */
  async findRouteByProductAndRevision(_productId: number, _revision: string, _transaction?: any): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findRouteByProductAndRevision nao implementado.');
  }

  /**
   * Busca o roteiro ATIVO de um produto, com lock pessimista quando dentro de
   * transacao — usado na ativacao para tornar `superseded` a revisao anterior
   * sem condicao de corrida (so pode existir 1 ativo por produto).
   *
   * @abstract
   * @param productId - Id do produto legado.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Roteiro ativo ou `null`.
   */
  async findActiveRouteByProduct(_productId: number, _transaction?: any): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findActiveRouteByProduct nao implementado.');
  }

  /**
   * Lista as revisoes ja usadas por um produto (para sugerir a proxima).
   *
   * @abstract
   * @param productId - Id do produto legado.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Lista de revisoes (strings).
   */
  async listRevisionsByProduct(_productId: number, _transaction?: any): Promise<string[]> {
    throw new Error('ProductionRouteRepository.listRevisionsByProduct nao implementado.');
  }

  /**
   * Cria o cabecalho do roteiro.
   *
   * @abstract
   * @param data - Campos do roteiro.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Roteiro criado.
   */
  async createRoute(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('ProductionRouteRepository.createRoute nao implementado.');
  }

  /**
   * Atualiza campos do cabecalho do roteiro.
   *
   * @abstract
   * @param id - Id do roteiro.
   * @param data - Campos a atualizar.
   * @param transaction - Transacao Sequelize ativa (opcional).
   */
  async updateRouteFields(_id: number, _data: Record<string, any>, _transaction?: any): Promise<void> {
    throw new Error('ProductionRouteRepository.updateRouteFields nao implementado.');
  }

  /**
   * Remove um roteiro (apenas rascunho sem apontamento — regra no use case).
   *
   * @abstract
   * @param id - Id do roteiro.
   * @param transaction - Transacao Sequelize ativa (opcional).
   */
  async deleteRoute(_id: number, _transaction?: any): Promise<void> {
    throw new Error('ProductionRouteRepository.deleteRoute nao implementado.');
  }

  /**
   * Lista as etapas de um roteiro, ordenadas por `sequence`.
   *
   * @abstract
   * @param routeId - Id do roteiro.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Etapas do roteiro.
   */
  async listSteps(_routeId: number, _transaction?: any): Promise<any[]> {
    throw new Error('ProductionRouteRepository.listSteps nao implementado.');
  }

  /**
   * Remove TODAS as etapas de um roteiro (substituicao total).
   *
   * @abstract
   * @param routeId - Id do roteiro.
   * @param transaction - Transacao Sequelize ativa (obrigatoria).
   */
  async deleteStepsByRoute(_routeId: number, _transaction: any): Promise<void> {
    throw new Error('ProductionRouteRepository.deleteStepsByRoute nao implementado.');
  }

  /**
   * Cria uma etapa de roteiro.
   *
   * @abstract
   * @param data - Campos da etapa.
   * @param transaction - Transacao Sequelize ativa (obrigatoria).
   * @returns Etapa criada.
   */
  async createStep(_data: Record<string, any>, _transaction: any): Promise<any> {
    throw new Error('ProductionRouteRepository.createStep nao implementado.');
  }

  /**
   * Conta apontamentos (`production_order_tracking`) que referenciam QUALQUER
   * etapa do roteiro. Guarda de historico: etapa ja apontada nunca some.
   *
   * @abstract
   * @param routeId - Id do roteiro.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Quantidade de apontamentos vinculados.
   */
  async countTrackingByRoute(_routeId: number, _transaction?: any): Promise<number> {
    throw new Error('ProductionRouteRepository.countTrackingByRoute nao implementado.');
  }

  /**
   * Busca o produto legado (`products`) alvo do roteiro.
   *
   * @abstract
   * @param productId - Id do produto.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Produto ou `null`.
   */
  async findProductByIdRaw(_productId: number, _transaction?: any): Promise<any | null> {
    throw new Error('ProductionRouteRepository.findProductByIdRaw nao implementado.');
  }

  /**
   * Resolve o `items.id` (UUID) equivalente a um `products.code`, para o
   * dual-write da coluna `production_routes.item_id` (Fase 4.8
   * expand-contract). Best-effort: devolve `null` quando nao ha Item
   * correspondente, sem quebrar o cadastro do roteiro.
   *
   * @abstract
   * @param productCode - `products.code`.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns UUID do Item ou `null`.
   */
  async findItemIdByProductCode(_productCode: string, _transaction?: any): Promise<string | null> {
    throw new Error('ProductionRouteRepository.findItemIdByProductCode nao implementado.');
  }

  /**
   * Busca centros de trabalho por lista de ids, para validar o vinculo das
   * etapas em UMA consulta (sem N+1).
   *
   * @abstract
   * @param ids - Ids de centro de trabalho.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Linhas `{ id, code, name, active }`.
   */
  async findWorkCentersByIds(_ids: number[], _transaction?: any): Promise<Array<{ id: number; code: string; name: string; active: boolean }>> {
    throw new Error('ProductionRouteRepository.findWorkCentersByIds nao implementado.');
  }
}

export = ProductionRouteRepository;
