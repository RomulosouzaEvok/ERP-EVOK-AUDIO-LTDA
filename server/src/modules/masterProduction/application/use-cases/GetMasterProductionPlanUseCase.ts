/**
 * Use case: obter um Plano Mestre de Produção com suas linhas (MPS, G17).
 *
 * @module modules/masterProduction/application/use-cases/GetMasterProductionPlanUseCase
 *
 * Cobre `GET /api/production/master-plans/:id`. Leitura pura, sem efeito
 * colateral — é a tela em que o planejador confronta demanda × suprimento
 * antes de decidir.
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import { MASTER_PLAN_RULE } from '../../domain/constants';

interface GetMasterProductionPlanInput {
  planId: number | string;
}

class GetMasterProductionPlanUseCase extends UseCase<GetMasterProductionPlanInput, any> {
  private readonly planRepository: MasterProductionPlanRepository;

  /** @param planRepository - Repositório do plano mestre. */
  public constructor(planRepository: MasterProductionPlanRepository) {
    super();
    this.planRepository = planRepository;
  }

  /**
   * @param input - Id do plano.
   * @returns Plano com `lines` (produto e OP gerada incluídos) e um resumo
   *   agregado do estado da decisão.
   * @throws {NotFoundError} Plano inexistente. `details: { rule: 'G17' }`.
   */
  public async execute(input: GetMasterProductionPlanInput): Promise<any> {
    const plan = await this.planRepository.findPlanById(input.planId);
    if (!plan) {
      throw new NotFoundError('Plano mestre não encontrado.', {
        rule: MASTER_PLAN_RULE,
        plan_id: input.planId,
      });
    }

    const plain = typeof plan.get === 'function' ? plan.get({ plain: true }) : plan;
    const lines: any[] = plain.lines ?? [];

    return {
      ...plain,
      summary: {
        total_lines: lines.length,
        pending_lines: lines.filter((line) => String(line.status) === 'pending').length,
        planned_lines: lines.filter((line) => String(line.status) === 'planned').length,
        dismissed_lines: lines.filter((line) => String(line.status) === 'dismissed').length,
        released_lines: lines.filter((line) => String(line.status) === 'released').length,
        total_suggested_quantity: sumField(lines, 'suggested_quantity'),
        total_planned_quantity: sumField(lines, 'planned_quantity'),
      },
    };
  }
}

/**
 * Soma um campo decimal das linhas (o Postgres devolve `DECIMAL` como string).
 *
 * @param lines - Linhas do plano.
 * @param field - Nome do campo.
 * @returns Soma numérica com 6 casas.
 */
function sumField(lines: any[], field: string): number {
  const total = lines.reduce((acc, line) => acc + (Number(line?.[field] ?? 0) || 0), 0);
  return Number(total.toFixed(6));
}

export = GetMasterProductionPlanUseCase;
