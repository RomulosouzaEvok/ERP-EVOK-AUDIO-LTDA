/**
 * Contrato do repositorio de Ordens de Producao.
 *
 * @module modules/production/domain/repositories/ProductionOrderRepository
 */

interface ProductionListFilters {
  status?: string;
  product_id?: number;
  priority?: string;
  start_date?: string;
  end_date?: string;
  limit: number;
  offset: number;
}

class ProductionOrderRepository {
  /**
   * Lista OPs com filtros e resumo.
   *
   * @param filters - Filtros e paginacao.
   * @returns Linhas, contagem e totais.
   * @throws {Error} Se nao implementado pela infraestrutura.
   */
  public async list(filters: ProductionListFilters): Promise<{ rows: any[]; count: number; totals: number[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @returns OP encontrada ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @returns OP sem includes ou null. @throws {Error} Se nao implementado. */
  public async findRawById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @param transaction - Transacao ativa. @returns OP travada ou null. @throws {Error} Se nao implementado. */
  public async findByIdForUpdate(id: number, transaction: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /**
   * Gera o proximo numero de OP do ano (`OP-YYYY-NNNN`) de forma serializada,
   * segura contra colisao.
   *
   * Substitui o antigo `countByOrderNumberPrefix` (removido em 2026-08-09,
   * gap G16 da auditoria da cadeia do produto): o numero era montado com
   * `COUNT(*) + 1` lido pelo caso de uso ANTES de cada `create`, o que
   * colidia em dois cenarios reais — (a) duas criacoes concorrentes liam a
   * mesma contagem e geravam o mesmo numero, e (b) o laco de conversao do
   * MRP relia a contagem a cada iteracao dentro da mesma transacao. Alem
   * disso, `COUNT` regride quando uma OP e removida
   * (`RemoveProductionOrderUseCase`), reemitindo um numero ja usado.
   *
   * @abstract
   * @param yearPrefix - Prefixo anual (ex.: `OP-2026`).
   * @param transaction - Transacao Sequelize ativa (obrigatoria para a serializacao).
   * @returns Proximo numero completo (ex.: `OP-2026-0004`).
   * @throws {Error} Se nao implementado.
   */
  public async nextOrderNumberForYear(yearPrefix: string, transaction: any): Promise<string> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param data - Dados da OP. @param transaction - Transacao opcional. @returns OP criada. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @param data - Campos. @param transaction - Transacao opcional. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number, data: Record<string, unknown>, transaction?: any): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @returns Linhas removidas. @throws {Error} Se nao implementado. */
  public async destroy(id: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID do produto. @param transaction - Transacao opcional. @returns Produto ou null. @throws {Error} Se nao implementado. */
  public async findProductById(id: number, transaction?: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /**
   * Conta as reservas de material ainda vivas da OP
   * (`production_order_reservations.status = 'active'`, gap G3).
   *
   * Usado por `RemoveProductionOrderUseCase` para impedir que uma OP seja
   * apagada segurando material: a FK e `ON DELETE CASCADE`, entao a remocao
   * levaria as reservas junto e deixaria o cache
   * `products.reserved_quantity` alto para sempre.
   *
   * @abstract
   * @param productionOrderId - ID da OP.
   * @returns Quantidade de reservas ativas.
   * @throws {Error} Se nao implementado.
   */
  public async countActiveMaterialReservations(productionOrderId: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param filters - Filtros do relatorio. @returns OPs do relatorio. @throws {Error} Se nao implementado. */
  public async listForReport(filters: Record<string, unknown>): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /**
   * Busca o roteiro ATIVO do produto com suas etapas ATIVAS, para materializar
   * o apontamento da OP na liberacao (gap G4).
   *
   * Le do agregado de roteiro (`production_routes` / `production_route_steps`)
   * mas mora aqui, e nao em `ProductionRouteRepository`, por uma razao de
   * desenho: quem materializa o apontamento e o agregado OP, e a alternativa
   * (injetar um segundo repositorio no caso de uso) espalharia a dependencia
   * por todos os pontos de construcao do use case sem ganho real.
   *
   * @abstract
   * @param productId - `products.id` do produto da OP.
   * @param transaction - Transacao Sequelize ativa.
   * @returns `{ id, route_code, revision, steps: [...] }` ou `null` se o
   *   produto nao tiver roteiro ativo. Etapas ordenadas por `sequence` e
   *   filtradas por `is_active = true`.
   * @throws {Error} Se nao implementado.
   */
  public async findActiveRouteWithStepsByProduct(productId: number, transaction: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /**
   * Cria varias linhas de apontamento de uma vez (materializacao do roteiro na
   * liberacao da OP, gap G4).
   *
   * @abstract
   * @param rows - Linhas a inserir em `production_order_tracking`.
   * @param transaction - Transacao Sequelize ativa.
   * @returns Linhas criadas.
   * @throws {Error} Se nao implementado.
   */
  public async bulkCreateTracking(rows: Array<Record<string, unknown>>, transaction: any): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /**
   * Busca o funcionario vinculado a um usuario do sistema.
   *
   * Existe para o G6: `production_orders.responsible_id` e FK para
   * **`employees.id`**, nao para `users.id` — gravar o id do JWT ali apontaria
   * para outra pessoa (ou para ninguem). Mesmo padrao ja usado em
   * `SequelizePurchaseRequisitionRepository.findEmployeeByUserId`.
   *
   * @abstract
   * @param userId - `users.id` (do JWT).
   * @param transaction - Transacao Sequelize ativa.
   * @returns Funcionario vinculado, ou `null` quando o usuario nao e funcionario.
   * @throws {Error} Se nao implementado.
   */
  public async findEmployeeByUserId(userId: number, transaction?: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }
}

export = ProductionOrderRepository;
