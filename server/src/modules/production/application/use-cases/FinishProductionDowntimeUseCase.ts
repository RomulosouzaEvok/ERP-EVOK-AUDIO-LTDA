/**
 * Use case: encerrar uma parada de máquina/centro de trabalho (downtime).
 *
 * @module modules/production/application/use-cases/FinishProductionDowntimeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../errors';
import { sequelize } from '../../../../config/database';

interface FinishProductionDowntimeInput {
  id: number;
  finished_at?: string;
}

class FinishProductionDowntimeUseCase extends UseCase<FinishProductionDowntimeInput, Promise<any>> {
  private readonly downtimeRepository: any;

  /** @param downtimeRepository - Repositório de paradas. */
  public constructor(downtimeRepository: any) {
    super();
    this.downtimeRepository = downtimeRepository;
  }

  /**
   * Encerra uma parada em aberto.
   *
   * @param input - ID da parada e horário de encerramento (default: agora).
   * @returns Parada atualizada, com associações.
   * @throws {NotFoundError} Se a parada não existir.
   * @throws {BusinessRuleError} Se a parada já estiver encerrada, ou se `finished_at` não for maior que `started_at`.
   */
  public async execute(input: FinishProductionDowntimeInput): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const downtime = await this.downtimeRepository.findByIdForUpdate(input.id, t);
      if (!downtime) throw new NotFoundError('Parada de producao nao encontrada');
      if (downtime.finished_at) {
        throw new BusinessRuleError(`Parada #${downtime.id} ja foi encerrada em ${new Date(downtime.finished_at).toLocaleString('pt-BR')}`);
      }

      const finishedAt = input.finished_at ? new Date(input.finished_at) : new Date();
      if (Number.isNaN(finishedAt.getTime())) {
        throw new ValidationError('finished_at invalido');
      }
      if (finishedAt.getTime() <= new Date(downtime.started_at).getTime()) {
        throw new BusinessRuleError('finished_at deve ser posterior a started_at');
      }

      await this.downtimeRepository.update(input.id, { finished_at: finishedAt }, t);

      await t.commit();
      return this.downtimeRepository.findById(input.id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = FinishProductionDowntimeUseCase;
