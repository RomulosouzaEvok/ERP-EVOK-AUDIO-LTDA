/**
 * Contrato de repositorio para o dominio de Engenharia (Projetos de P&D,
 * Desenhos Tecnicos e Ficha Tecnica Thiele-Small de Itens).
 *
 * Define as operacoes de persistencia necessarias para os tres submodulos.
 * Implementado por {@link SequelizeEngineeringRepository} na camada de
 * infraestrutura.
 *
 * @module modules/engineering/domain/repositories/EngineeringRepository
 */

class EngineeringRepository {
  // ---------------------------------------------------------------------
  // Projetos de Engenharia (P&D)
  // ---------------------------------------------------------------------

  /**
   * Lista projetos de engenharia paginados.
   *
   * @abstract
   * @param filters - Filtros aceitos (`status`, `stage`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listProjects(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('EngineeringRepository.listProjects nao implementado.');
  }

  /**
   * Busca um projeto de engenharia por id.
   *
   * @abstract
   * @param id - Id do projeto.
   * @returns Projeto ou `null`.
   */
  async findProjectById(_id: number): Promise<any | null> {
    throw new Error('EngineeringRepository.findProjectById nao implementado.');
  }

  /**
   * Busca um projeto de engenharia pelo codigo unico.
   *
   * @abstract
   * @param projectCode - Codigo unico do projeto.
   * @returns Projeto ou `null`.
   */
  async findProjectByCode(_projectCode: string): Promise<any | null> {
    throw new Error('EngineeringRepository.findProjectByCode nao implementado.');
  }

  /**
   * Cria um novo projeto de engenharia.
   *
   * @abstract
   * @param data - Campos do projeto.
   * @returns Projeto criado.
   */
  async createProject(_data: Record<string, any>): Promise<any> {
    throw new Error('EngineeringRepository.createProject nao implementado.');
  }

  /**
   * Atualiza um projeto de engenharia existente.
   *
   * @abstract
   * @param id - Id do projeto.
   * @param data - Campos a atualizar.
   * @returns Projeto atualizado ou `null` se nao existir.
   */
  async updateProject(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('EngineeringRepository.updateProject nao implementado.');
  }

  // ---------------------------------------------------------------------
  // Desenhos Tecnicos
  // ---------------------------------------------------------------------

  /**
   * Lista desenhos tecnicos paginados.
   *
   * @abstract
   * @param filters - Filtros aceitos (`product_id`, `status`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listDrawings(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('EngineeringRepository.listDrawings nao implementado.');
  }

  /**
   * Busca um desenho tecnico por id.
   *
   * @abstract
   * @param id - Id do desenho.
   * @returns Desenho ou `null`.
   */
  async findDrawingById(_id: number): Promise<any | null> {
    throw new Error('EngineeringRepository.findDrawingById nao implementado.');
  }

  /**
   * Busca um desenho tecnico pela combinacao unica numero+revisao.
   *
   * @abstract
   * @param drawingNumber - Numero do desenho.
   * @param revision - Revisao do desenho.
   * @returns Desenho ou `null`.
   */
  async findDrawingByNumberAndRevision(_drawingNumber: string, _revision: string): Promise<any | null> {
    throw new Error('EngineeringRepository.findDrawingByNumberAndRevision nao implementado.');
  }

  /**
   * Cria um novo desenho tecnico.
   *
   * @abstract
   * @param data - Campos do desenho.
   * @returns Desenho criado.
   */
  async createDrawing(_data: Record<string, any>): Promise<any> {
    throw new Error('EngineeringRepository.createDrawing nao implementado.');
  }

  /**
   * Atualiza um desenho tecnico existente.
   *
   * @abstract
   * @param id - Id do desenho.
   * @param data - Campos a atualizar.
   * @returns Desenho atualizado ou `null` se nao existir.
   */
  async updateDrawing(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('EngineeringRepository.updateDrawing nao implementado.');
  }

  // ---------------------------------------------------------------------
  // Ficha Tecnica (ItemEspecificacaoTecnica)
  // ---------------------------------------------------------------------

  /**
   * Busca um item pelo id (para validar existencia antes da ficha tecnica).
   *
   * @abstract
   * @param itemId - Id (UUID) do item.
   * @returns Item ou `null`.
   */
  async findItemById(_itemId: string): Promise<any | null> {
    throw new Error('EngineeringRepository.findItemById nao implementado.');
  }

  /**
   * Busca a especificacao tecnica de um item.
   *
   * @abstract
   * @param itemId - Id (UUID) do item.
   * @returns Especificacao tecnica ou `null`.
   */
  async findTechnicalSpecByItemId(_itemId: string): Promise<any | null> {
    throw new Error('EngineeringRepository.findTechnicalSpecByItemId nao implementado.');
  }

  /**
   * Cria ou atualiza (upsert) a especificacao tecnica de um item.
   *
   * @abstract
   * @param itemId - Id (UUID) do item.
   * @param data - `{ familia_tecnica, atributos }`.
   * @returns Especificacao tecnica persistida.
   */
  async upsertTechnicalSpec(_itemId: string, _data: Record<string, any>): Promise<any> {
    throw new Error('EngineeringRepository.upsertTechnicalSpec nao implementado.');
  }
}

export = EngineeringRepository;
