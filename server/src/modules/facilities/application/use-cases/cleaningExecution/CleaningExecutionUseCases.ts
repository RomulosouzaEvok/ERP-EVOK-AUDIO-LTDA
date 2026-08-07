/**
 * Casos de uso de Execução de Limpeza (RF-FAC-049/050), cobrindo
 * `/api/facilities/cleaning-executions`.
 *
 * @module modules/facilities/application/use-cases/cleaningExecution/CleaningExecutionUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import CleaningExecutionRepository from '../../../domain/repositories/CleaningExecutionRepository';
import CleaningScheduleRepository from '../../../domain/repositories/CleaningScheduleRepository';
import InventoryService from '../../services/InventoryService';
import { sequelize } from '../../../../../config/database';

/** `GET /api/facilities/cleaning-executions` */
export class ListCleaningExecutionsUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly executionRepository: CleaningExecutionRepository) {
    super();
  }

  async execute({ plan_id, ok, from, to, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.executionRepository.list({ plan_id, ok, from, to }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `POST /api/facilities/cleaning-executions` — registra execução contra um plano. */
export class CreateCleaningExecutionUseCase extends UseCase<Record<string, any>, any> {
  constructor(
    private readonly executionRepository: CleaningExecutionRepository,
    private readonly scheduleRepository: CleaningScheduleRepository,
    private readonly inventoryService: InventoryService,
  ) {
    super();
  }

  async execute(input: Record<string, any> & { executedBy: number }) {
    const plan = await this.scheduleRepository.findCleaningScheduleById(input.plan_id);
    if (!plan) throw new NotFoundError('Plano de limpeza não encontrado.');

    return sequelize.transaction(async (transaction) => {
      const execution = await this.executionRepository.create({
        plan_id: input.plan_id,
        executed_at: input.executed_at ?? new Date(),
        executed_by: input.executedBy,
        ok: input.ok ?? true,
        notes: input.notes ?? null,
      });

      for (const supply of input.supplies_consumed ?? []) {
        await this.inventoryService.registerConsumption({
          item_id: supply.item_id,
          quantity: supply.quantity,
          userId: input.executedBy,
          referenceType: 'facility_cleaning_execution',
          referenceId: execution.id,
          transaction,
        });
      }

      return execution;
    });
  }
}

/** `GET /api/facilities/cleaning-schedules/:id/adherence` — KPI de aderência (RF-FAC-050). */
export class CleaningAdherenceUseCase extends UseCase<{ id: number; from: string; to: string }, any> {
  constructor(private readonly scheduleRepository: CleaningScheduleRepository, private readonly executionRepository: CleaningExecutionRepository) {
    super();
  }

  private frequencyToDays(frequency: string): number {
    const map: Record<string, number> = { daily: 1, alternate: 2, weekly: 7, biweekly: 14, monthly: 30 };
    return map[frequency] ?? 7;
  }

  async execute({ id, from, to }: { id: number; from: string; to: string }) {
    const plan = await this.scheduleRepository.findCleaningScheduleById(id);
    if (!plan) throw new NotFoundError('Plano de limpeza não encontrado.');

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000));
    const expected = Math.max(1, Math.floor(periodDays / this.frequencyToDays(plan.frequency)));

    const actual = await this.executionRepository.countByPlanInPeriod(id, fromDate, toDate);

    return {
      plan_id: id,
      period: { from, to },
      expected_executions: expected,
      actual_executions: actual,
      adherence_rate: Math.round((actual / expected) * 1000) / 10,
    };
  }
}
