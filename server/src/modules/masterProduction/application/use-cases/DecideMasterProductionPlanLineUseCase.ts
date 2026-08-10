/**
 * Use case: **registrar a decisão do planejador sobre uma linha do plano
 * mestre** (MPS, G17).
 *
 * @module modules/masterProduction/application/use-cases/DecideMasterProductionPlanLineUseCase
 *
 * Cobre `PATCH /api/production/master-plans/:id/lines/:lineId`. É literalmente
 * o ponto onde a decisão de gente entra no sistema — o que a decisão D-F do
 * dono do produto ("existe PCP formal, há quem planeje") pediu que existisse.
 *
 * Duas decisões possíveis, e ambas são registro:
 * - **produzir**: `planned_quantity > 0` → linha vai para `planned`;
 * - **não produzir**: `dismiss: true` → linha vai para `dismissed`, com
 *   `planned_quantity` zerada.
 *
 * `dismissed` existe de propósito, em vez de simplesmente deixar a linha em
 * `pending`: "o planejador olhou e decidiu não produzir" é informação
 * diferente de "ninguém olhou". Sem essa distinção, o plano firmado não diria
 * se a cobertura da demanda foi avaliada.
 *
 * `suggested_quantity` **nunca** é alterada aqui. A divergência entre o que o
 * sistema calculou e o que o humano decidiu é justamente o que uma auditoria
 * de PCP procura.
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../../errors';
import MasterProductionPlanRepository = require('../../domain/repositories/MasterProductionPlanRepository');
import { MASTER_PLAN_RULE, isPlanEditable, roundQuantity } from '../../domain/constants';

/** Formato aceito de data (o banco usa `DATEONLY`). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface DecideMasterProductionPlanLineInput {
  planId: number | string;
  lineId: number | string;
  planned_quantity?: number | string;
  due_date?: string;
  notes?: string;
  dismiss?: boolean;
  /** Sempre do JWT (`req.user.id`) — nunca do body. */
  decidedBy: number;
}

class DecideMasterProductionPlanLineUseCase extends UseCase<DecideMasterProductionPlanLineInput, any> {
  private readonly planRepository: MasterProductionPlanRepository;

  /** @param planRepository - Repositório do plano mestre. */
  public constructor(planRepository: MasterProductionPlanRepository) {
    super();
    this.planRepository = planRepository;
  }

  /**
   * Grava a decisão do planejador na linha.
   *
   * @param input - Ids do plano e da linha, decisão e `decidedBy` (do JWT).
   * @returns Linha atualizada.
   * @throws {NotFoundError} Plano ou linha inexistentes, ou linha de outro plano.
   *   `details: { rule: 'G17' }`.
   * @throws {BusinessRuleError} Plano já firmado/liberado/cancelado (decisão
   *   congelada). `details: { rule: 'G17', status }`.
   * @throws {ValidationError} Quantidade negativa, data mal formada ou decisão
   *   ausente. `details: { rule: 'G17', field }`.
   */
  public async execute(input: DecideMasterProductionPlanLineInput): Promise<any> {
    const plan = await this.planRepository.findPlanByIdRaw(input.planId);
    if (!plan) {
      throw new NotFoundError('Plano mestre não encontrado.', {
        rule: MASTER_PLAN_RULE,
        plan_id: input.planId,
      });
    }

    if (!isPlanEditable(String(plan.status))) {
      throw new BusinessRuleError(
        `Plano ${plan.plan_number} está '${plan.status}' e suas linhas não podem mais ser alteradas. `
        + 'Depois de firmado, o plano é decisão registrada — para mudar, cancele e crie um novo.',
        { rule: MASTER_PLAN_RULE, plan_id: plan.id, status: plan.status },
      );
    }

    const line = await this.planRepository.findLineById(input.lineId);
    if (!line || Number(line.plan_id) !== Number(plan.id)) {
      throw new NotFoundError('Linha não encontrada neste plano mestre.', {
        rule: MASTER_PLAN_RULE,
        plan_id: input.planId,
        line_id: input.lineId,
      });
    }

    const dismiss = input.dismiss === true;
    const hasQuantity = input.planned_quantity !== undefined && input.planned_quantity !== null && String(input.planned_quantity).trim() !== '';

    if (dismiss && hasQuantity) {
      throw new ValidationError(
        'Informe planned_quantity OU dismiss, nunca os dois: são decisões opostas.',
        { rule: MASTER_PLAN_RULE, field: 'dismiss' },
      );
    }
    if (!dismiss && !hasQuantity) {
      throw new ValidationError(
        'Nenhuma decisão informada: envie planned_quantity (produzir) ou dismiss=true (não produzir).',
        { rule: MASTER_PLAN_RULE, field: 'planned_quantity' },
      );
    }

    const changes: Record<string, unknown> = {
      decided_by: input.decidedBy,
      decided_at: new Date(),
    };

    if (input.notes !== undefined) {
      changes.notes = input.notes === null || String(input.notes).trim() === '' ? null : String(input.notes).trim();
    }

    if (input.due_date !== undefined) {
      const dueDate = String(input.due_date ?? '').trim();
      if (!ISO_DATE.test(dueDate) || Number.isNaN(Date.parse(dueDate))) {
        throw new ValidationError('due_date deve estar no formato YYYY-MM-DD.', {
          rule: MASTER_PLAN_RULE,
          field: 'due_date',
        });
      }
      changes.due_date = dueDate;
    }

    if (dismiss) {
      changes.planned_quantity = 0;
      changes.status = 'dismissed';
    } else {
      const quantity = roundQuantity(input.planned_quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new ValidationError('planned_quantity deve ser um número maior ou igual a zero.', {
          rule: MASTER_PLAN_RULE,
          field: 'planned_quantity',
        });
      }
      changes.planned_quantity = quantity;
      // Quantidade zero é decisão de não produzir tanto quanto `dismiss` —
      // deixá-la como `planned` criaria linha "a produzir 0", que na liberação
      // viraria uma OP de quantidade zero (a mesma armadilha que o G2 fechou
      // na conclusão da OP).
      changes.status = quantity > 0 ? 'planned' : 'dismissed';
    }

    return this.planRepository.updateLine(line.id, changes);
  }
}

export = DecideMasterProductionPlanLineUseCase;
