/**
 * `PUT /api/rh/training-courses/:id` — sem `DELETE`.
 *
 * RF-INT-RH-SST-01 (decisão do dono, 2026-08-12): mesma sobrescrita de
 * `CreateTrainingCourseUseCase` — se, DEPOIS de aplicar este PUT parcial, o
 * curso for normativo com `nr_code` cadastrado e ativo na matriz SST, a
 * validade GRAVADA é a da matriz (ignora `validity_months` do payload),
 * `validity_source: 'sst_matrix'` na resposta, sem `warning`. Caso
 * contrário, comportamento manual de sempre.
 *
 * @module modules/rh/application/use-cases/training/UpdateTrainingCourseUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import TrainingCourseRepository from '../../../domain/repositories/TrainingCourseRepository';
import TrainingMatrixService from '../../services/TrainingMatrixService';
import { normativeWarning } from '../../../domain/services/trainingRules';

interface UpdateTrainingCourseInput {
  id: number | string;
  name?: string;
  is_normative?: boolean;
  nr_code?: string | null;
  validity_months?: number | null;
  workload_hours?: number | null;
  active?: boolean;
}

class UpdateTrainingCourseUseCase extends UseCase<UpdateTrainingCourseInput, any> {
  private readonly trainingCourseRepository: TrainingCourseRepository;
  private readonly trainingMatrixService: TrainingMatrixService | undefined;

  public constructor(trainingCourseRepository: TrainingCourseRepository, trainingMatrixService?: TrainingMatrixService) {
    super();
    this.trainingCourseRepository = trainingCourseRepository;
    this.trainingMatrixService = trainingMatrixService;
  }

  /**
   * @throws {ValidationError} `validity_months` <= 0 (400).
   * @throws {NotFoundError} Curso não existe (404).
   */
  public async execute(input: UpdateTrainingCourseInput): Promise<any> {
    if (input.validity_months !== undefined && input.validity_months !== null && input.validity_months <= 0) {
      throw new ValidationError('validity_months deve ser maior que zero.');
    }

    const existing = await this.trainingCourseRepository.findById(input.id);
    if (!existing) throw new NotFoundError('Curso de treinamento não encontrado.');

    const { id, ...data } = input;
    const effectiveIsNormative = data.is_normative !== undefined ? Boolean(data.is_normative) : Boolean(existing.is_normative);
    const effectiveNrCode = data.nr_code !== undefined ? data.nr_code : existing.nr_code;

    let validitySource: 'sst_matrix' | 'manual' = 'manual';
    if (effectiveIsNormative && effectiveNrCode && this.trainingMatrixService) {
      const matrixEntry = await this.trainingMatrixService.findValidityByNrCode(effectiveNrCode);
      if (matrixEntry) {
        data.validity_months = matrixEntry.periodicidade_meses;
        validitySource = 'sst_matrix';
      }
    }

    const updated = await this.trainingCourseRepository.update(id, data);
    if (!updated) throw new NotFoundError('Curso de treinamento não encontrado.');

    const plain = typeof (updated as any)?.toJSON === 'function' ? (updated as any).toJSON() : updated;
    const result = { ...plain, validity_source: validitySource };
    const warning = validitySource === 'manual' && effectiveIsNormative && effectiveNrCode ? normativeWarning(true) : null;
    return warning ? { ...result, warning } : result;
  }
}

export = UpdateTrainingCourseUseCase;
