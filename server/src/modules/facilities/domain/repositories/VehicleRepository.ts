/**
 * Contrato de repositório para o domínio de Veículos de Frota
 * (`FacilityVehicle`), módulo Facilities.
 *
 * @module modules/facilities/domain/repositories/VehicleRepository
 */

class VehicleRepository {
  /**
   * Lista veículos paginados, com filtro opcional de `status`.
   *
   * @abstract
   */
  async listVehicles(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('VehicleRepository.listVehicles não implementado.');
  }

  /**
   * Busca um veículo por id.
   *
   * @abstract
   */
  async findVehicleById(_id: number): Promise<any | null> {
    throw new Error('VehicleRepository.findVehicleById não implementado.');
  }

  /**
   * Busca um veículo pela placa (única).
   *
   * @abstract
   */
  async findVehicleByPlate(_plate: string): Promise<any | null> {
    throw new Error('VehicleRepository.findVehicleByPlate não implementado.');
  }

  /**
   * Cria um veículo.
   *
   * @abstract
   */
  async createVehicle(_data: Record<string, any>): Promise<any> {
    throw new Error('VehicleRepository.createVehicle não implementado.');
  }

  /**
   * Atualiza um veículo existente.
   *
   * @abstract
   */
  async updateVehicle(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('VehicleRepository.updateVehicle não implementado.');
  }
}

export = VehicleRepository;
