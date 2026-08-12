import type { Transaction } from 'sequelize';

/**
 * Contrato de repositório do Grupo 10 — Frequência/Ponto (importação AEJ).
 * A camada de aplicação (use cases) depende apenas desta interface, nunca
 * de uma implementação concreta (`SequelizeTimeImportRepository`).
 *
 * @module modules/rh/domain/repositories/TimeImportRepository
 */
abstract class TimeImportRepository {
  abstract createBatch(data: Record<string, unknown>, transaction?: Transaction): Promise<any>;
  abstract updateBatch(id: number | string, data: Record<string, unknown>, transaction?: Transaction): Promise<any | null>;
  abstract findBatchById(id: number | string, transaction?: Transaction): Promise<any | null>;
  abstract findBatchByIdForUpdate(id: number | string, transaction: Transaction): Promise<any | null>;
  abstract findAndCountBatches(
    filters: { status?: string; competencia?: string },
    pagination: { limit: number; offset: number },
  ): Promise<{ count: number; rows: any[] }>;

  abstract bulkCreateItems(items: Array<Record<string, unknown>>, transaction?: Transaction): Promise<any[]>;
  abstract listItemsByBatch(batchId: number | string): Promise<any[]>;
  /** `transaction` é obrigatório-em-espírito quando chamado ainda dentro da transação de criação do lote (READ COMMITTED não enxerga linhas não commitadas de outra conexão). */
  abstract listUnmatchedItemsByBatch(batchId: number | string, transaction?: Transaction): Promise<any[]>;

  /** `employees.cpf` (dígitos) → `employees.id`, para o subconjunto de CPFs informado — casamento em lote. */
  abstract findEmployeeIdsByCpf(cpfs: string[]): Promise<Map<string, number>>;

  /**
   * Itens de lotes CONFIRMADOS cujo `work_date` cai dentro de
   * `[competenciaInicio, competenciaFim]`, agrupados por funcionário —
   * insumo do resumo mensal (`GetMonthlyAttendanceSummaryUseCase`).
   */
  abstract listConfirmedItemsByPeriod(
    competenciaInicio: string,
    competenciaFim: string,
    employeeId?: number | string,
  ): Promise<any[]>;

  /**
   * Afastamentos (`hr_absences`) que se sobrepõem ao período informado,
   * para o cruzamento do resumo mensal (RF exigido pela tarefa).
   */
  abstract listAbsencesOverlappingPeriod(
    competenciaInicio: string,
    competenciaFim: string,
    employeeId?: number | string,
  ): Promise<any[]>;
}

export = TimeImportRepository;
