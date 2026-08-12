/**
 * Caso de uso: registra o valor REALIZADO (`actual_value`) de um objetivo
 * estratégico, cobrindo `PATCH /api/directorate/strategic-plannings/:id/actual`.
 *
 * Separado de {@link module:modules/directorate/application/use-cases/strategic-planning/UpdateStrategicPlanningUseCase}
 * de propósito: registrar o realizado é um ato distinto de editar o plano
 * (mesmo espírito de "inspecionar" × "liberar" no módulo Qualidade — atos
 * diferentes merecem endpoints diferentes, não um PUT genérico que aceita
 * qualquer campo).
 *
 * Quando `target_value` está preenchido, deriva `status` automaticamente:
 * `actual_value >= target_value` → `achieved`; caso contrário `in_progress`
 * (nunca sobrescreve `not_achieved` automaticamente — essa é uma decisão
 * humana explícita, feita via `UpdateStrategicPlanningUseCase`). Sem
 * `target_value` (objetivo sem meta numérica), o status não é alterado
 * automaticamente.
 *
 * @module modules/directorate/application/use-cases/strategic-planning/UpdateStrategicPlanningActualUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type UpdateStrategicPlanningActualInput = {
  id: number;
  actual_value: number;
};

class UpdateStrategicPlanningActualUseCase extends UseCase<UpdateStrategicPlanningActualInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /** @throws {NotFoundError} Objetivo inexistente. */
  async execute(input: UpdateStrategicPlanningActualInput) {
    const existing = await this.directorateRepository.findStrategicPlanningById(input.id);
    if (!existing) {
      throw new NotFoundError(`Objetivo estratégico #${input.id} não encontrado.`);
    }

    const data: Record<string, unknown> = { actual_value: input.actual_value };

    const targetValue = existing.target_value === null || existing.target_value === undefined
      ? null
      : Number(existing.target_value);

    if (targetValue !== null) {
      data.status = input.actual_value >= targetValue ? 'achieved' : 'in_progress';
    }

    return this.directorateRepository.updateStrategicPlanning(input.id, data);
  }
}

export = UpdateStrategicPlanningActualUseCase;
