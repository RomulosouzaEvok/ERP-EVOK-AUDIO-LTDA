/**
 * Contrato de repositório para o domínio de Áreas Físicas
 * (`FacilityArea`), módulo Facilities.
 *
 * @module modules/facilities/domain/repositories/AreaRepository
 */

class AreaRepository {
  /**
   * Lista áreas físicas paginadas, com filtro opcional de `area_type`/`department_id`.
   *
   * @abstract
   */
  async listAreas(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('AreaRepository.listAreas não implementado.');
  }

  /**
   * Busca uma área física por id.
   *
   * @abstract
   */
  async findAreaById(_id: number): Promise<any | null> {
    throw new Error('AreaRepository.findAreaById não implementado.');
  }

  /**
   * Cria uma área física.
   *
   * @abstract
   */
  async createArea(_data: Record<string, any>): Promise<any> {
    throw new Error('AreaRepository.createArea não implementado.');
  }

  /**
   * Atualiza uma área física existente.
   *
   * @abstract
   */
  async updateArea(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('AreaRepository.updateArea não implementado.');
  }
}

export = AreaRepository;
