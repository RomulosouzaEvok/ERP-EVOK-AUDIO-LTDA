/**
 * Use case: **firmar ou cancelar um Plano Mestre de Produção** (MPS, G17).
 *
 * @module modules/masterProduction/application/use-cases/ChangeMasterProductionPlanStatusUseCase
 *
 * Cobre `POST /api/production/master-plans/:id/firm` e
 * `POST /api/production/master-plans/:id/cancel`. A transição `firm → released`
 * NÃO passa por aqui: liberar é gerar ordens de produção, com validação de
 * material e escrita em outra tabela, e vive em
 * `ReleaseMasterProductionPlanUseCase`.
 *
 * ## Firmar é o ato que transforma rascunho em decisão
 *
 * Depois de `firm`, as linhas não mudam mais (`isPlanEditable` só aceita
 * `draft`). Por isso firmar **exige que exista decisão**: pelo menos uma linha
 * `planned` com quantidade maior que zero. Um plano em que ninguém decidiu
 * nada não é um plano — é uma consulta, e liberar dele produziria zero OP com
 * status `released` mentindo que a fábrica foi acionada.
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import { MASTER_PLAN_RULE, canTransitionPlan } from '../../domain/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sequelize } = require('../../../../models/index');

interface ChangeMasterProductionPlanStatusInput {
  planId: number | string;
  /** Status alvo: `firm` ou `canceled`. */
  targetStatus: 'firm' | 'canceled';
  reason?: string;
  /** Sempre do JWT (`req.user.id`) — nunca do body. */
  userId: number;
}

class ChangeMasterProductionPlanStatusUseCase extends UseCase<ChangeMasterProductionPlanStatusInput, any> {
  private readonly planRepository: MasterProductionPlanRepository;

  /** @param planRepository - Repositório do plano mestre. */
  public constructor(planRepository: MasterProductionPlanRepository) {
    super();
    this.planRepository = planRepository;
  }

  /**
   * Aplica a transição de status do plano.
   *
   * @param input - Id do plano, status alvo, motivo opcional e `userId` (do JWT).
   * @returns Plano com o novo status.
   * @throws {NotFoundError} Plano inexistente. `details: { rule: 'G17' }`.
   * @throws {BusinessRuleError} Transição não permitida pela máquina de estados,
   *   ou tentativa de firmar plano sem nenhuma decisão registrada.
   *   `details: { rule: 'G17', ... }`.
   */
  public async execute(input: ChangeMasterProductionPlanStatusInput): Promise<any> {
    return sequelize.transaction(async (transaction: any) => {
      const plan = await this.planRepository.findPlanByIdForUpdate(input.planId, transaction);
      if (!plan) {
        throw new NotFoundError('Plano mestre não encontrado.', {
          rule: MASTER_PLAN_RULE,
          plan_id: input.planId,
        });
      }

      if (!canTransitionPlan(String(plan.status), input.targetStatus)) {
        throw new BusinessRuleError(
          `Transição de status inválida para o plano ${plan.plan_number}: '${plan.status}' -> '${input.targetStatus}'.`,
          {
            rule: MASTER_PLAN_RULE,
            plan_id: plan.id,
            current_status: plan.status,
            target_status: input.targetStatus,
          },
        );
      }

      const changes: Record<string, unknown> = { status: input.targetStatus };

      if (input.targetStatus === 'firm') {
        const lines = await this.planRepository.listLinesByPlan(plan.id, transaction);
        const decided = lines.filter(
          (line: any) => String(line.status) === 'planned' && Number(line.planned_quantity ?? 0) > 0,
        );

        if (!decided.length) {
          throw new BusinessRuleError(
            `Plano ${plan.plan_number} não tem nenhuma decisão de produção registrada. `
            + 'Informe planned_quantity em pelo menos uma linha antes de firmar — o plano mestre existe para registrar a decisão do planejador, não para congelar um cálculo.',
            {
              rule: MASTER_PLAN_RULE,
              plan_id: plan.id,
              total_lines: lines.length,
              decided_lines: 0,
            },
          );
        }

        changes.firmed_by = input.userId;
        changes.firmed_at = new Date();
      } else {
        changes.canceled_by = input.userId;
        changes.canceled_at = new Date();
        changes.cancel_reason = input.reason ? String(input.reason).trim() : null;
      }

      await this.planRepository.updatePlan(plan.id, changes, transaction);
      return { ...plan.get({ plain: true }), ...changes };
    });
  }
}

export = ChangeMasterProductionPlanStatusUseCase;
