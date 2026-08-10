/**
 * Use case: listar Planos Mestres de Produção (MPS, G17).
 *
 * @module modules/masterProduction/application/use-cases/ListMasterProductionPlansUseCase
 *
 * Cobre `GET /api/production/master-plans`. Leitura pura, sem efeito colateral.
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import { MASTER_PLAN_RULE, PLAN_STATUSES } from '../../domain/constants';

/** Limite máximo de página — mesmo teto usado nos demais módulos. */
const MAX_LIMIT = 100;

interface ListMasterProductionPlansInput {
  status?: string;
  page?: number | string;
  limit?: number | string;
}

class ListMasterProductionPlansUseCase extends UseCase<ListMasterProductionPlansInput, any> {
  private readonly planRepository: MasterProductionPlanRepository;

  /** @param planRepository - Repositório do plano mestre. */
  public constructor(planRepository: MasterProductionPlanRepository) {
    super();
    this.planRepository = planRepository;
  }

  /**
   * @param input - Filtros e paginação.
   * @returns `{ rows, total, page, limit, totalPages }`.
   * @throws {ValidationError} Se `status` não for um literal válido do ENUM.
   *   `details: { rule: 'G17', field: 'status' }`.
   */
  public async execute(input: ListMasterProductionPlansInput = {}): Promise<any> {
    const where: Record<string, unknown> = {};

    if (input.status !== undefined && String(input.status).trim() !== '') {
      const status = String(input.status).trim();
      // Literal fora do ENUM chega ao Postgres como erro 500 de comparação —
      // a classe de defeito catalogada em
      // `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
      // Barrar aqui transforma isso num 400 explicável.
      if (!(PLAN_STATUSES as readonly string[]).includes(status)) {
        throw new ValidationError(`status inválido: '${status}'.`, {
          rule: MASTER_PLAN_RULE,
          field: 'status',
          allowed_values: PLAN_STATUSES,
        });
      }
      where.status = status;
    }

    const page = Math.max(1, Number(input.page ?? 1) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(input.limit ?? 20) || 20));
    const offset = (page - 1) * limit;

    const { rows, count } = await this.planRepository.listPlans(where, { limit, offset });

    return {
      rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 0,
    };
  }
}

export = ListMasterProductionPlansUseCase;
