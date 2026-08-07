/**
 * Contrato de repositório para o domínio de Programação de Limpeza
 * (`FacilityCleaningSchedule`), módulo Facilities.
 *
 * @module modules/facilities/domain/repositories/CleaningScheduleRepository
 */

class CleaningScheduleRepository {
  /**
   * Lista programações de limpeza paginadas.
   *
   * @abstract
   */
  async listCleaningSchedules(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('CleaningScheduleRepository.listCleaningSchedules não implementado.');
  }

  /**
   * Busca uma programação de limpeza por id.
   *
   * @abstract
   */
  async findCleaningScheduleById(_id: number): Promise<any | null> {
    throw new Error('CleaningScheduleRepository.findCleaningScheduleById não implementado.');
  }

  /**
   * Cria uma programação de limpeza.
   *
   * @abstract
   */
  async createCleaningSchedule(_data: Record<string, any>): Promise<any> {
    throw new Error('CleaningScheduleRepository.createCleaningSchedule não implementado.');
  }

  /**
   * Atualiza uma programação de limpeza existente.
   *
   * @abstract
   */
  async updateCleaningSchedule(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('CleaningScheduleRepository.updateCleaningSchedule não implementado.');
  }
}

export = CleaningScheduleRepository;
