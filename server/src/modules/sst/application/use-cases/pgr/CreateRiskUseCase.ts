/**
 * Use case: criar item do inventário de riscos ocupacionais (PGR/GRO,
 * NR-1, RF-SST-035/036, BR-SST-026).
 *
 * Suporta o caso "ausência de risco identificado"
 * (`ausencia_risco_identificado: true`, sem `categoria_agente`/`agente`) —
 * a mesma coerência do CHECK de banco
 * `ck_sst_riscos_ocupacionais_ausencia_coerente` é validada aqui antes do
 * INSERT, para retornar `ValidationError` (400) amigável em vez de deixar
 * o Postgres rejeitar com erro de constraint.
 *
 * @module modules/sst/application/use-cases/pgr/CreateRiskUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import PgrRepository from '../../../domain/repositories/PgrRepository';
import { ValidationError } from '../../../../../errors';
import { fromRiskInput, toRiskDTO } from '../../../infrastructure/mappers/PgrMapper';

interface CreateRiskInput {
  body: Record<string, any>;
  createdBy: number;
}

class CreateRiskUseCase extends UseCase<CreateRiskInput, any> {
  private readonly pgrRepository: PgrRepository;

  public constructor(pgrRepository: PgrRepository) {
    super();
    this.pgrRepository = pgrRepository;
  }

  /** @throws {ValidationError} `department_id` ausente ou incoerência entre `ausencia_risco_identificado` e `categoria_agente`/`agente` (400). */
  public async execute({ body, createdBy }: CreateRiskInput): Promise<any> {
    if (!body.department_id) throw new ValidationError('department_id é obrigatório.');

    const ausencia = body.ausencia_risco_identificado === true;
    if (ausencia && (body.categoria_agente || body.agente)) {
      throw new ValidationError('Quando ausencia_risco_identificado = true, categoria_agente e agente devem ser omitidos.');
    }
    if (!ausencia && (!body.categoria_agente || !body.agente)) {
      throw new ValidationError('categoria_agente e agente são obrigatórios quando ausencia_risco_identificado não é true.');
    }

    const risco = await this.pgrRepository.createRisk({ ...fromRiskInput(body), created_by: createdBy });
    return toRiskDTO(risco);
  }
}

export = CreateRiskUseCase;
