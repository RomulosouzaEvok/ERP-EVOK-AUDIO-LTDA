/**
 * Contrato de repositorio para o dominio de Laboratorio (testes acusticos
 * / Thiele-Small sobre produtos, lotes e numeros de serie).
 *
 * Define as operacoes de persistencia necessarias para registrar e
 * consultar {@link AcousticTestResult}. Implementado por
 * {@link SequelizeLaboratoryRepository} na camada de infraestrutura.
 *
 * @module modules/laboratory/domain/repositories/LaboratoryRepository
 */

class LaboratoryRepository {
  /**
   * Cria um novo resultado de teste de laboratorio.
   *
   * @abstract
   * @param data - Campos do teste.
   * @param transaction - Transacao Sequelize ativa (opcional; usada quando
   *   o teste destrutivo precisa debitar o Deposito LABORATORIO na mesma
   *   transacao, UC-42-E).
   * @returns Teste criado.
   */
  async createTest(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('LaboratoryRepository.createTest nao implementado.');
  }

  /**
   * Atualiza um resultado de teste (ex.: para gravar `non_conformity_id`
   * apos criar a RNC associada).
   *
   * @abstract
   * @param id - Id do teste.
   * @param data - Campos a atualizar.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Teste atualizado ou `null` se nao existir.
   */
  async updateTest(_id: number, _data: Record<string, any>, _transaction?: any): Promise<any | null> {
    throw new Error('LaboratoryRepository.updateTest nao implementado.');
  }

  /**
   * Busca um teste por id, com `product` e `tester` incluidos.
   *
   * @abstract
   * @param id - Id do teste.
   * @returns Teste ou `null`.
   */
  async findTestById(_id: number): Promise<any | null> {
    throw new Error('LaboratoryRepository.findTestById nao implementado.');
  }

  /**
   * Lista testes de laboratorio paginados, com `product` e `tester`
   * incluidos.
   *
   * @abstract
   * @param filters - Filtros aceitos (`product_id`, `test_type`, `passed`,
   *   `serial_number`, `start_date`, `end_date`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listTests(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('LaboratoryRepository.listTests nao implementado.');
  }

  /**
   * Agrega, por `test_type`, o total/aprovados/reprovados/taxa de aprovacao
   * dos ultimos `days` dias (opcionalmente filtrado por `product_id`).
   *
   * @abstract
   * @param filters - `{ product_id?, days }`.
   * @returns Linhas agregadas por `test_type`.
   */
  async getSummary(_filters: { product_id?: number; days: number }): Promise<any[]> {
    throw new Error('LaboratoryRepository.getSummary nao implementado.');
  }
}

export = LaboratoryRepository;
