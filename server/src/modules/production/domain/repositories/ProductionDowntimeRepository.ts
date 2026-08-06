/**
 * Contrato do repositório de Paradas de Máquina (`ProductionDowntime`).
 *
 * @module modules/production/domain/repositories/ProductionDowntimeRepository
 */

import type { ListDowntimesFilters } from './ProductionDowntimeTypes';

class ProductionDowntimeRepository {
  /**
   * Busca a parada aberta (`finished_at IS NULL`) de um centro de trabalho,
   * se houver.
   *
   * @param workCenterId - ID do centro de trabalho.
   * @param transaction - Transação ativa (para checagem consistente antes do insert).
   * @returns Instância aberta, ou `null`.
   * @throws {Error} Se não implementado.
   */
  public async findOpenByWorkCenter(workCenterId: number, transaction?: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da parada. @returns Instância encontrada, com associações, ou `null`. @throws {Error} Se não implementado. */
  public async findById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da parada. @param transaction - Transação ativa. @returns Instância travada (`FOR UPDATE`), ou `null`. @throws {Error} Se não implementado. */
  public async findByIdForUpdate(id: number, transaction: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param data - Dados da parada. @param transaction - Transação opcional. @returns Parada criada. @throws {Error} Se não implementado. */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da parada. @param data - Campos a atualizar. @param transaction - Transação opcional. @returns Linhas afetadas. @throws {Error} Se não implementado. */
  public async update(id: number, data: Record<string, unknown>, transaction?: any): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param filters - Filtros e paginação. @returns Linhas e contagem total. @throws {Error} Se não implementado. */
  public async list(filters: ListDowntimesFilters): Promise<{ rows: any[]; count: number }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }
}

export = ProductionDowntimeRepository;
