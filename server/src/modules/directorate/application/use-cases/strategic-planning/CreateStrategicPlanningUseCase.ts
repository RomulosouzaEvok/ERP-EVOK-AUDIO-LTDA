/**
 * Caso de uso: criação de um objetivo estratégico anual, cobrindo
 * `POST /api/directorate/strategic-plannings`.
 *
 * @module modules/directorate/application/use-cases/strategic-planning/CreateStrategicPlanningUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type StrategicPlanningStatus = 'not_started' | 'in_progress' | 'achieved' | 'not_achieved';

type CreateStrategicPlanningInput = {
  year: number;
  objective: string;
  directorate_id?: number | null;
  department_id?: number | null;
  kpi?: string | null;
  target_value?: number | null;
  weight?: number | null;
  status?: StrategicPlanningStatus;
  responsible_id?: number | null;
  createdBy: number;
};

/** Menor ano aceito — regra simples de sanidade, mesma faixa usada em `budget`. */
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

class CreateStrategicPlanningUseCase extends UseCase<CreateStrategicPlanningInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /**
   * @throws {ValidationError} Ano fora da faixa aceita, `directorate_id` e `department_id`
   *   informados ao mesmo tempo (o dono é UM dos dois, ou nenhum — CHECK `strategic_plannings_owner_xor_ck`
   *   no banco reforça a mesma regra), ou `weight` fora de 0–100.
   */
  async execute(input: CreateStrategicPlanningInput) {
    if (input.year < MIN_YEAR || input.year > MAX_YEAR) {
      throw new ValidationError(`Ano ${input.year} fora da faixa aceita (${MIN_YEAR}-${MAX_YEAR}).`);
    }

    if (input.directorate_id && input.department_id) {
      throw new ValidationError(
        'Um objetivo estratégico pertence a UMA diretoria OU a UM departamento, nunca aos dois ao mesmo tempo.',
      );
    }

    if (typeof input.weight === 'number' && (input.weight < 0 || input.weight > 100)) {
      throw new ValidationError('weight deve estar entre 0 e 100.');
    }

    return this.directorateRepository.createStrategicPlanning({
      year: input.year,
      objective: input.objective,
      directorate_id: input.directorate_id ?? null,
      department_id: input.department_id ?? null,
      kpi: input.kpi ?? null,
      target_value: input.target_value ?? null,
      actual_value: null,
      weight: input.weight ?? null,
      status: input.status ?? 'not_started',
      responsible_id: input.responsible_id ?? null,
      created_by: input.createdBy,
    });
  }
}

export = CreateStrategicPlanningUseCase;
