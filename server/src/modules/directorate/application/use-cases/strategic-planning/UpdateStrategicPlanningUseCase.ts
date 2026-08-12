/**
 * Caso de uso: atualização de campos de um objetivo estratégico
 * (exceto `actual_value`, que tem caso de uso dedicado —
 * {@link module:modules/directorate/application/use-cases/strategic-planning/UpdateStrategicPlanningActualUseCase}),
 * cobrindo `PUT /api/directorate/strategic-plannings/:id`.
 *
 * @module modules/directorate/application/use-cases/strategic-planning/UpdateStrategicPlanningUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type StrategicPlanningStatus = 'not_started' | 'in_progress' | 'achieved' | 'not_achieved';

type UpdateStrategicPlanningInput = {
  id: number;
  year?: number;
  objective?: string;
  directorate_id?: number | null;
  department_id?: number | null;
  kpi?: string | null;
  target_value?: number | null;
  weight?: number | null;
  status?: StrategicPlanningStatus;
  responsible_id?: number | null;
};

class UpdateStrategicPlanningUseCase extends UseCase<UpdateStrategicPlanningInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /**
   * @throws {NotFoundError} Objetivo inexistente.
   * @throws {ValidationError} `directorate_id` e `department_id` informados ao mesmo tempo, ou `weight` fora de 0–100.
   */
  async execute(input: UpdateStrategicPlanningInput) {
    const { id, ...data } = input;

    const existing = await this.directorateRepository.findStrategicPlanningById(id);
    if (!existing) {
      throw new NotFoundError(`Objetivo estratégico #${id} não encontrado.`);
    }

    const nextDirectorateId = 'directorate_id' in data ? data.directorate_id : existing.directorate_id;
    const nextDepartmentId = 'department_id' in data ? data.department_id : existing.department_id;
    if (nextDirectorateId && nextDepartmentId) {
      throw new ValidationError(
        'Um objetivo estratégico pertence a UMA diretoria OU a UM departamento, nunca aos dois ao mesmo tempo.',
      );
    }

    if (typeof data.weight === 'number' && (data.weight < 0 || data.weight > 100)) {
      throw new ValidationError('weight deve estar entre 0 e 100.');
    }

    return this.directorateRepository.updateStrategicPlanning(id, data);
  }
}

export = UpdateStrategicPlanningUseCase;
