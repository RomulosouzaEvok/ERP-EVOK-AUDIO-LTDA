/**
 * Use case: registrar um TreinamentoSST realizado (RF-SST-045/047).
 *
 * `validade` é calculada a partir de
 * `sst_matriz_treinamento.periodicidade_reciclagem_meses` para o par
 * função/norma do funcionário. FLUXO DE EXCEÇÃO (decisão de design desta
 * passada): se a matriz não tiver periodicidade cadastrada para a
 * função/norma, `validade` fica `null` (treinamento sem reciclagem
 * periódica exigida) — não é erro; é o comportamento documentado da
 * coluna `sst_matriz_treinamento.periodicidade_reciclagem_meses` NULL.
 *
 * @module modules/sst/application/use-cases/training/CreateTrainingUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TrainingRepository from '../../../domain/repositories/TrainingRepository';
import { ValidationError } from '../../../../../errors';
import { fromTrainingInput, toTrainingDTO } from '../../../infrastructure/mappers/TrainingMapper';

const NORMAS = ['NR-6', 'NR-10', 'NR-11', 'NR-12', 'NR-17', 'NR-20', 'NR-23_brigada', 'primeiros_socorros', 'CIPA', 'DDS_tema', 'outro'];

interface CreateTrainingInput {
  body: Record<string, any>;
  createdBy: number;
  employeePosition?: string | null;
}

/** Soma N meses a uma data (YYYY-MM-DD), retornando string YYYY-MM-DD. */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

class CreateTrainingUseCase extends UseCase<CreateTrainingInput, any> {
  private readonly trainingRepository: TrainingRepository;

  public constructor(trainingRepository: TrainingRepository) {
    super();
    this.trainingRepository = trainingRepository;
  }

  /** @throws {ValidationError} Campos obrigatórios ausentes ou `norma` inválida (400). */
  public async execute({ body, createdBy, employeePosition }: CreateTrainingInput): Promise<any> {
    if (!body.employee_id || !body.norma || !body.data || body.carga_horaria == null) {
      throw new ValidationError('employee_id, norma, data e carga_horaria são obrigatórios.');
    }
    if (!NORMAS.includes(body.norma)) throw new ValidationError(`norma inválida. Valores aceitos: ${NORMAS.join(', ')}.`);

    let validade: string | null = null;
    if (employeePosition) {
      const matriz = await this.trainingRepository.findMatrixByPositionAndNorma(employeePosition, body.norma);
      if (matriz?.periodicidade_reciclagem_meses) {
        validade = addMonths(body.data, matriz.periodicidade_reciclagem_meses);
      }
    }
    if (!validade && body.norma === 'NR-10') {
      validade = addMonths(body.data, 24);
    }

    const treinamento = await this.trainingRepository.createTraining({
      ...fromTrainingInput(body),
      validade,
      created_by: createdBy
    });
    return toTrainingDTO(treinamento);
  }
}

export = CreateTrainingUseCase;
