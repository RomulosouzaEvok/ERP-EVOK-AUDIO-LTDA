/**
 * Contrato de repositorio para o dominio de Centros de Trabalho (WorkCenter).
 *
 * Define as operacoes de persistencia necessarias para CRUD de centros de
 * trabalho, substituicao de turnos e o calculo de carga-maquina. Implementado
 * por {@link SequelizeWorkCenterRepository} na camada de infraestrutura.
 *
 * @module modules/workCenters/domain/repositories/WorkCenterRepository
 */

class WorkCenterRepository {
  /**
   * Lista centros de trabalho paginados, com turnos incluidos.
   *
   * @abstract
   * @param filters - Filtros aceitos (`active`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listWorkCenters(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('WorkCenterRepository.listWorkCenters nao implementado.');
  }

  /**
   * Busca um centro de trabalho por id, com turnos incluidos.
   *
   * @abstract
   * @param id - Id do centro de trabalho.
   * @returns Centro de trabalho ou `null`.
   */
  async findWorkCenterById(_id: number): Promise<any | null> {
    throw new Error('WorkCenterRepository.findWorkCenterById nao implementado.');
  }

  /**
   * Busca um centro de trabalho pelo codigo unico (sem includes).
   *
   * @abstract
   * @param code - Codigo unico do centro de trabalho.
   * @returns Centro de trabalho ou `null`.
   */
  async findWorkCenterByCode(_code: string): Promise<any | null> {
    throw new Error('WorkCenterRepository.findWorkCenterByCode nao implementado.');
  }

  /**
   * Cria um novo centro de trabalho.
   *
   * @abstract
   * @param data - Campos do centro de trabalho.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Centro de trabalho criado.
   */
  async createWorkCenter(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('WorkCenterRepository.createWorkCenter nao implementado.');
  }

  /**
   * Atualiza um centro de trabalho existente.
   *
   * @abstract
   * @param id - Id do centro de trabalho.
   * @param data - Campos a atualizar.
   * @param transaction - Transacao Sequelize ativa (opcional).
   * @returns Centro de trabalho atualizado ou `null` se nao existir.
   */
  async updateWorkCenter(_id: number, _data: Record<string, any>, _transaction?: any): Promise<any | null> {
    throw new Error('WorkCenterRepository.updateWorkCenter nao implementado.');
  }

  /**
   * Remove todos os turnos de um centro de trabalho (usado antes de recriar).
   *
   * @abstract
   * @param workCenterId - Id do centro de trabalho.
   * @param transaction - Transacao Sequelize ativa (obrigatoria).
   */
  async deleteShiftsByWorkCenter(_workCenterId: number, _transaction: any): Promise<void> {
    throw new Error('WorkCenterRepository.deleteShiftsByWorkCenter nao implementado.');
  }

  /**
   * Cria um turno para um centro de trabalho.
   *
   * @abstract
   * @param data - `{ work_center_id, weekday, start_time, end_time }`.
   * @param transaction - Transacao Sequelize ativa (obrigatoria).
   * @returns Turno criado.
   */
  async createShift(_data: Record<string, any>, _transaction: any): Promise<any> {
    throw new Error('WorkCenterRepository.createShift nao implementado.');
  }

  /**
   * Lista todos os centros de trabalho ativos com seus turnos, para o
   * calculo de carga-maquina.
   *
   * @abstract
   * @returns Lista de centros de trabalho ativos com `shifts` anexados.
   */
  async listActiveWorkCentersWithShifts(): Promise<any[]> {
    throw new Error('WorkCenterRepository.listActiveWorkCentersWithShifts nao implementado.');
  }

  /**
   * Agrega, por `work_center_id`, a carga de horas pendente (restante) das
   * OPs ativas (planned/released/in_progress/paused) cujas etapas de
   * roteiro apontam para o centro de trabalho.
   *
   * @abstract
   * @returns Linhas `{ work_center_id, load_hours, steps_count }`.
   */
  async aggregateLoadByWorkCenter(): Promise<Array<{ work_center_id: number; load_hours: number; steps_count: number }>> {
    throw new Error('WorkCenterRepository.aggregateLoadByWorkCenter nao implementado.');
  }
}

export = WorkCenterRepository;
