import type { Transaction } from 'sequelize';

/**
 * Interface (contrato) de repositório do módulo Qualidade — registro de
 * inspeção de lote (G7).
 *
 * A camada de aplicação depende apenas desta interface, nunca do Sequelize.
 * O contrato é propositalmente pequeno: além do CRUD mínimo da inspeção, ele
 * expõe `findLatestInspectionForLot`, que é a **única** consulta de que o
 * gate de liberação de lote precisa (`ReleaseLotUseCase`). Manter o gate
 * dependente de um método só evita que o módulo de estoque acabe importando
 * o model de qualidade direto — o mesmo motivo pelo qual
 * `materialReceiptService` acessa lote por um gateway injetado.
 *
 * @module modules/quality/domain/repositories/QualityRepository
 */
class QualityRepository {
  /**
   * Busca um lote (`lot_controls`) pelo id — usado para validar o vínculo da
   * inspeção e herdar `product_id`/`lot_number` na abertura de RNC.
   *
   * @abstract
   * @param id - Id do lote.
   * @returns Lote encontrado ou `null`.
   */
  async findLotById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('QualityRepository.findLotById não implementado.');
  }

  /**
   * Persiste um registro de inspeção.
   *
   * @abstract
   * @param data - Campos da inspeção já validados pelo caso de uso.
   * @param transaction - Transação Sequelize ativa (opcional).
   * @returns Inspeção criada.
   */
  async createInspection(data: Record<string, unknown>, transaction?: Transaction): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('QualityRepository.createInspection não implementado.');
  }

  /**
   * Atualiza campos de uma inspeção já criada (hoje apenas
   * `non_conformity_id`, gravado depois que a RNC da reprovação nasce).
   *
   * @abstract
   * @param id - Id da inspeção.
   * @param data - Campos a atualizar.
   * @returns Inspeção atualizada ou `null` se não existir.
   */
  async updateInspection(id: number | string, data: Record<string, unknown>): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('QualityRepository.updateInspection não implementado.');
  }

  /**
   * Busca uma inspeção pelo id.
   *
   * @abstract
   * @param id - Id da inspeção.
   * @returns Inspeção encontrada ou `null`.
   */
  async findInspectionById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('QualityRepository.findInspectionById não implementado.');
  }

  /**
   * Busca a inspeção MAIS RECENTE de um lote (`inspected_at DESC`, desempate
   * por `id DESC`). É a consulta que alimenta o gate de liberação — ver
   * `decideLotRelease` em `modules/quality/domain/constants.ts`.
   *
   * @abstract
   * @param lotId - Id do lote.
   * @param transaction - Transação Sequelize ativa (opcional).
   * @returns Inspeção mais recente ou `null` se o lote nunca foi inspecionado.
   */
  async findLatestInspectionForLot(lotId: number | string, transaction?: Transaction): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('QualityRepository.findLatestInspectionForLot não implementado.');
  }

  /**
   * Lista inspeções com filtros e paginação.
   *
   * @abstract
   * @param where - Filtro (`lot_id`, `verdict`, `stage`, `inspector_id`).
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  async listInspections(
    where?: Record<string, unknown>, // eslint-disable-line no-unused-vars
    pagination?: { limit?: number; offset?: number } // eslint-disable-line no-unused-vars
  ): Promise<{ rows: any[]; count: number }> {
    throw new Error('QualityRepository.listInspections não implementado.');
  }
}

export = QualityRepository;
