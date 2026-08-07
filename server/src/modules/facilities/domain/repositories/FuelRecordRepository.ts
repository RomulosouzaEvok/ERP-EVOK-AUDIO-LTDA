/**
 * Contrato de repositório para o domínio de Abastecimento
 * (`FacilityFuelRecord`), módulo Facilities.
 *
 * @module modules/facilities/domain/repositories/FuelRecordRepository
 */

class FuelRecordRepository {
  /**
   * Lista registros de abastecimento paginados, com filtro opcional de
   * `vehicle_id`.
   *
   * @abstract
   */
  async listFuelRecords(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('FuelRecordRepository.listFuelRecords não implementado.');
  }

  /**
   * Busca um registro de abastecimento por id.
   *
   * @abstract
   */
  async findFuelRecordById(_id: number): Promise<any | null> {
    throw new Error('FuelRecordRepository.findFuelRecordById não implementado.');
  }

  /**
   * Cria um registro de abastecimento.
   *
   * @abstract
   */
  async createFuelRecord(_data: Record<string, any>): Promise<any> {
    throw new Error('FuelRecordRepository.createFuelRecord não implementado.');
  }

  /**
   * Atualiza um registro de abastecimento existente.
   *
   * @abstract
   */
  async updateFuelRecord(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('FuelRecordRepository.updateFuelRecord não implementado.');
  }
}

export = FuelRecordRepository;
