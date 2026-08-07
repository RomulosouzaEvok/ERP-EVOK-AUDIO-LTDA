/**
 * Contrato de repositório para o domínio de Materiais de Divulgação
 * (`MarketingMaterial`), módulo Marketing.
 *
 * @module modules/marketing/domain/repositories/MaterialRepository
 */

class MaterialRepository {
  /**
   * Lista materiais paginados, com filtros opcionais de `material_type`/`product_id`/`approved`.
   *
   * @abstract
   */
  async listMaterials(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('MaterialRepository.listMaterials não implementado.');
  }

  /**
   * Busca um material por id.
   *
   * @abstract
   */
  async findMaterialById(_id: number): Promise<any | null> {
    throw new Error('MaterialRepository.findMaterialById não implementado.');
  }

  /**
   * Cria um material.
   *
   * @abstract
   */
  async createMaterial(_data: Record<string, any>): Promise<any> {
    throw new Error('MaterialRepository.createMaterial não implementado.');
  }

  /**
   * Atualiza um material existente.
   *
   * @abstract
   */
  async updateMaterial(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('MaterialRepository.updateMaterial não implementado.');
  }
}

export = MaterialRepository;
