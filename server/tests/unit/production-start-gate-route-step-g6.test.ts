/**
 * G6 — regra pura do gate de PARTIDA da OP, com o furo do apontamento manual
 * fechado (auditoria de 2026-08-11).
 *
 * `assertOrderCanStart` contava linhas de apontamento. Como
 * `POST /api/production-orders/:id/tracking` aceita
 * `production_route_step_id: null` (apontamento manual — fluxo legítimo, para
 * registrar o que o roteiro não previu), **uma linha manual vazia destravava
 * a partida de uma OP sem roteiro nenhum**, que é exatamente o que o G6
 * existe para impedir.
 *
 * O comportamento ponta a ponta (incluindo a fronteira "apontar à mão DEPOIS
 * da partida continua livre") está em
 * `tests/integration/production-start-manual-tracking-bypass.test.ts`.
 *
 * @module tests/unit/production-start-gate-route-step-g6
 */
import { BusinessRuleError } from '../../src/errors';
import {
  PRODUCTION_TRACKING_RULES,
  assertOrderCanStart,
  type TrackingStepSnapshot,
} from '../../src/modules/production/domain/productionTrackingRules';

/**
 * Captura o erro lancado pelo gate.
 *
 * @param steps - Etapas de apontamento da OP.
 * @param context - Contexto do produto (`activeRouteStepCount`).
 * @returns O erro lancado, ou `null` quando o gate aprovou.
 */
function catchStart(steps: TrackingStepSnapshot[], context?: { activeRouteStepCount?: number }): any {
  try {
    assertOrderCanStart('OP-2026-0001', steps, context);
    return null;
  } catch (error) {
    return error;
  }
}

describe('G6 — a OP so parte com lastro de roteiro', () => {
  it('nenhuma linha de apontamento: recusa com G6-START-NO-ROUTE (regra original)', () => {
    const error = catchStart([]);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.START_WITHOUT_ROUTE);
  });

  it('SO linha manual (sem etapa de roteiro) e sem roteiro ativo: recusa com G6-START-NO-ROUTE-STEP', () => {
    const error = catchStart(
      [{ id: 1, sequence: 1, status: 'pending', production_route_step_id: null, routeStep: null }],
      { activeRouteStepCount: 0 },
    );

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.START_WITHOUT_ROUTE_STEP);
    expect(error.details).toMatchObject({ tracking_count: 1, tracking_with_route_step: 0, active_route_step_count: 0 });
    // A mensagem tem de dizer o caminho da correcao — quem esbarra nisso e o
    // chao de fabrica, nao quem escreveu a regra.
    expect(error.message).toContain('Roteiros de Fabricacao');
  });

  it('linha manual, MAS com roteiro ativo cadastrado: parte (e a saida que a mensagem indica)', () => {
    expect(catchStart(
      [{ id: 1, sequence: 1, status: 'pending', production_route_step_id: null }],
      { activeRouteStepCount: 1 },
    )).toBeNull();
  });

  it('linha materializada do roteiro: parte mesmo sem contexto de roteiro informado', () => {
    expect(catchStart([
      { id: 1, sequence: 1, status: 'pending', production_route_step_id: 501 },
    ])).toBeNull();
  });

  it('aceita o vinculo vindo do include (`routeStep.id`), nao so da coluna', () => {
    // A MESMA FK vista de dois jeitos: a regra nao pode depender de qual
    // consulta trouxe a linha.
    expect(catchStart([
      { id: 1, sequence: 1, status: 'pending', routeStep: { id: 501, step_code: 'OP10' } },
    ])).toBeNull();
  });

  it('basta UMA linha com etapa entre varias manuais', () => {
    expect(catchStart([
      { id: 1, sequence: 1, status: 'completed', production_route_step_id: null },
      { id: 2, sequence: 2, status: 'pending', production_route_step_id: 502 },
      { id: 3, sequence: 3, status: 'pending', production_route_step_id: null },
    ])).toBeNull();
  });

  it('centro de trabalho inativo continua barrando (regra anterior intacta)', () => {
    const error = catchStart([
      {
        id: 1,
        sequence: 1,
        status: 'pending',
        production_route_step_id: 501,
        routeStep: { id: 501, step_code: 'OP10', workCenter: { id: 9, code: 'WC-9', name: 'Montagem', active: false } },
      },
    ]);

    expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.START_WORK_CENTER_INACTIVE);
  });

  it('a recusa por falta de etapa vem ANTES da checagem de centro inativo', () => {
    // Ordem importa para a mensagem: sem roteiro, falar de centro de trabalho
    // confundiria quem esta tentando por a ordem para rodar.
    const error = catchStart(
      [{ id: 1, sequence: 1, status: 'pending', production_route_step_id: null, routeStep: null }],
      { activeRouteStepCount: 0 },
    );

    expect(error.details.rule).toBe(PRODUCTION_TRACKING_RULES.START_WITHOUT_ROUTE_STEP);
  });
});
