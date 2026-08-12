/**
 * `POST /api/rh/training-courses` — RF-RH-055, §11.2 do contrato de API.
 *
 * RF-INT-RH-SST-01 (decisão do dono, 2026-08-12): quando `is_normative=true`
 * e `nr_code` está cadastrado, ATIVO, na matriz oficial de treinamentos do
 * SST (`TrainingMatrixService`), a validade GRAVADA é a da matriz — o
 * `validity_months` do payload é ignorado nesse caso, a resposta traz o
 * valor efetivo e `validity_source: 'sst_matrix'`, e o aviso RF-RH-059 NÃO é
 * emitido (a validade não é mais um palpite do RH, veio de quem é dono do
 * dado). Quando o `nr_code` não está na matriz (ou não foi informado, ou
 * `trainingMatrixService` não foi injetado), o comportamento é o de sempre:
 * `validity_months` manual + `warning` + `validity_source: 'manual'`.
 *
 * @module modules/rh/application/use-cases/training/CreateTrainingCourseUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import TrainingCourseRepository from '../../../domain/repositories/TrainingCourseRepository';
import TrainingMatrixService from '../../services/TrainingMatrixService';
import { normativeWarning } from '../../../domain/services/trainingRules';

interface CreateTrainingCourseInput {
  name: string;
  is_normative?: boolean;
  nr_code?: string | null;
  validity_months?: number | null;
  workload_hours?: number | null;
  active?: boolean;
}

class CreateTrainingCourseUseCase extends UseCase<CreateTrainingCourseInput, any> {
  private readonly trainingCourseRepository: TrainingCourseRepository;
  private readonly trainingMatrixService: TrainingMatrixService | undefined;

  public constructor(trainingCourseRepository: TrainingCourseRepository, trainingMatrixService?: TrainingMatrixService) {
    super();
    this.trainingCourseRepository = trainingCourseRepository;
    this.trainingMatrixService = trainingMatrixService;
  }

  /** @throws {ValidationError} `name` ausente; `validity_months` <= 0 (400). */
  public async execute(input: CreateTrainingCourseInput): Promise<any> {
    if (!input.name) throw new ValidationError('name é obrigatório.');
    if (input.validity_months !== undefined && input.validity_months !== null && input.validity_months <= 0) {
      throw new ValidationError('validity_months deve ser maior que zero.');
    }
    const isNormative = Boolean(input.is_normative);

    let validityMonths = input.validity_months ?? null;
    let validitySource: 'sst_matrix' | 'manual' = 'manual';
    if (isNormative && input.nr_code && this.trainingMatrixService) {
      const matrixEntry = await this.trainingMatrixService.findValidityByNrCode(input.nr_code);
      if (matrixEntry) {
        validityMonths = matrixEntry.periodicidade_meses;
        validitySource = 'sst_matrix';
      }
    }

    const created = await this.trainingCourseRepository.create({
      name: input.name,
      is_normative: isNormative,
      nr_code: input.nr_code ?? null,
      validity_months: validityMonths,
      workload_hours: input.workload_hours ?? null,
      active: input.active ?? true,
    });

    const plain = typeof (created as any)?.toJSON === 'function' ? (created as any).toJSON() : created;
    const result = { ...plain, validity_source: validitySource };
    const warning = validitySource === 'manual' && isNormative && input.nr_code ? normativeWarning(true) : null;
    return warning ? { ...result, warning } : result;
  }
}

export = CreateTrainingCourseUseCase;
