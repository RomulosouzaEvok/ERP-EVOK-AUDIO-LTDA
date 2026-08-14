/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * ALVO A — Máquina de estados da Ordem de Produção: matriz COMPLETA de
 * transições (6 status × 6 status = 36 combinações) que o código aceita ou
 * recusa HOJE, incluindo a regra de precedência entre "mesmo status" e
 * "transição inválida" e os campos que a própria entidade grava quando
 * aceita uma transição.
 *
 * Comportamento congelado:
 *   - O grafo vigente é: planned -> {released, canceled}; released ->
 *     {in_progress, canceled}; in_progress -> {completed, paused, canceled};
 *     paused -> {in_progress, canceled}; completed e canceled são TERMINAIS
 *     (nenhuma saída, nem para si mesmos).
 *   - QUALQUER transição para o MESMO status (inclusive de um status
 *     terminal para ele mesmo) é recusada por um caminho de código
 *     DIFERENTE do das transições fora do grafo: a checagem de
 *     "self-transition" roda ANTES da checagem "não está na lista de
 *     permitidas", e a mensagem de erro é sempre `OP ja esta com status X`
 *     — nunca `Transicao invalida: X -> X`, mesmo sendo tecnicamente também
 *     uma transição ausente do grafo.
 *   - Transições aceitas gravam campos adicionais SÓ em dois casos: `->
 *     in_progress` grava `start_date`; `-> completed` grava
 *     `quantity_produced`, `quantity_scrapped`, `scrap_reason` e
 *     `completion_date`. Para `-> released`, `-> paused` e `-> canceled`, a
 *     ENTIDADE devolve apenas `{ status }` — qualquer outro efeito colateral
 *     dessas transições (liberar reserva ao cancelar, reservar material ao
 *     liberar, etc.) acontece no USE CASE, fora do escopo deste arquivo (já
 *     coberto por `production-order-lifecycle.test.ts`).
 *
 * Âncoras:
 *   - BR-PP-001 — docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_planejamento-producao.md:24-42
 *   - server/src/modules/production/domain/entities/ProductionOrderEntity.ts:60-67 (STATUS_TRANSITIONS, o grafo)
 *   - server/src/modules/production/domain/entities/ProductionOrderEntity.ts:157-213 (transitionTo — precedência
 *     self-transition x fora-do-grafo nas linhas 164-165; efeitos colaterais nas linhas 186-210)
 *   - Consumido por server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts:81,
 *     ANTES de qualquer leitura/escrita adicional (reserva G3, gate G6, apontamento G4, custeio) — a entidade é a
 *     ÚNICA dona do grafo; o use case não reimplementa nem duplica a matriz.
 *
 * Por que unit contra a entidade (e não integração via API):
 *   `ProductionOrderEntity` não depende de banco/Sequelize — `Entity`
 *   (shared/domain/Entity.ts) é POJO puro e `transitionTo` é síncrono e
 *   determinístico. Como o use case chama `entity.transitionTo(...)` na
 *   linha 81 ANTES de qualquer outra operação, um teste de integração via
 *   API precisaria de fixtures reais de OP em 36 estados distintos só para
 *   provar o mesmo grafo síncrono — 36 chamadas HTTP contra banco efêmero
 *   para reprovar exatamente o erro (422 BUSINESS_RULE_VIOLATION) que a
 *   entidade já lança sem tocar em nada externo. É fragilidade sem ganho de
 *   cobertura. A concorrência (dupla transição simultânea na mesma OP) e os
 *   efeitos colaterais de cada transição aceita já têm teste dedicado em
 *   `production-order-status-concurrency.test.ts` e
 *   `production-order-lifecycle.test.ts` — este arquivo NÃO duplica essa
 *   cobertura, congela apenas o grafo em si, célula por célula.
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 */

import ProductionOrderEntity = require('../../src/modules/production/domain/entities/ProductionOrderEntity');
import { BusinessRuleError } from '../../src/errors';

type Status = 'planned' | 'released' | 'in_progress' | 'paused' | 'completed' | 'canceled';

const ALL_STATUSES: Status[] = ['planned', 'released', 'in_progress', 'paused', 'completed', 'canceled'];

/**
 * Matriz de transições ESPERADA, transcrita à mão a partir da leitura de
 * `ProductionOrderEntity.ts:60-67` — hardcoded de propósito (não importada
 * do próprio código-fonte): se o grafo mudar em produção sem que alguém
 * atualize este arquivo, o teste deve QUEBRAR. É o próprio objetivo da
 * caracterização — travar o comportamento atual, não segui-lo.
 */
const EXPECTED_VALID_TRANSITIONS: Record<Status, Status[]> = {
  planned: ['released', 'canceled'],
  released: ['in_progress', 'canceled'],
  in_progress: ['completed', 'paused', 'canceled'],
  paused: ['in_progress', 'canceled'],
  completed: [],
  canceled: [],
};

/**
 * Instancia uma OP mínima válida no status informado, pronta para
 * `transitionTo`. `due_date` é obrigatório na validação do construtor da
 * entidade — sem ele o construtor estoura `ValidationError` antes de o
 * teste sequer chegar na transição (armadilha já documentada em
 * `production-order-lifecycle.test.ts`).
 *
 * @param status - Status inicial da OP para este cenário.
 * @returns Nova instância de `ProductionOrderEntity`, uma por chamada — o
 *   objeto não é reaproveitado entre asserções porque `transitionTo` não
 *   muta `this.status` (só devolve os campos a persistir), mas cada
 *   cenário do laço principal precisa de uma OP "fresca" e isolada.
 */
function makeOrder(status: Status): ProductionOrderEntity {
  return new ProductionOrderEntity({
    id: 1,
    product_id: 1,
    quantity: 10,
    status,
    due_date: '2026-12-31',
  });
}

/**
 * Executa `transitionTo` e captura o erro lançado, sem deixar o `it`
 * quebrar por exceção não tratada.
 *
 * @param order - Entidade no status de origem do cenário.
 * @param to - Status de destino da transição sob teste.
 * @returns O erro capturado, ou `undefined` se a transição não lançou.
 */
function captureTransitionError(order: ProductionOrderEntity, to: Status): any {
  try {
    order.transitionTo(to);
    return undefined;
  } catch (error) {
    return error;
  }
}

describe('PASSO 30 — Máquina de estados da Ordem de Produção (BR-PP-001) — matriz completa 6x6', () => {
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      const isSelfTransition = from === to;
      const isValid = !isSelfTransition && EXPECTED_VALID_TRANSITIONS[from].includes(to);

      if (isSelfTransition) {
        it(`${from} -> ${to} (mesmo status): RECUSA com "OP ja esta com status ${to}" (checagem roda ANTES da lista de permitidas, mesmo quando ${from} é terminal)`, () => {
          const error = captureTransitionError(makeOrder(from), to);
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toBe(`OP ja esta com status ${to}`);
          expect(error.statusCode).toBe(422);
          // Nunca a mensagem de "fora do grafo" — ainda que tecnicamente
          // X -> X também não conste da lista de destinos permitidos de X.
          expect(error.message).not.toContain('Transicao invalida');
        });
      } else if (isValid) {
        it(`${from} -> ${to}: ACEITA`, () => {
          const order = makeOrder(from);
          const quantityProduced = to === 'completed' ? 7 : undefined;
          const changes = order.transitionTo(to, quantityProduced);

          expect(changes.status).toBe(to);

          if (to === 'in_progress') {
            // paused->in_progress e released->in_progress: SÓ start_date é
            // gravado pela entidade; o gate G6 (roteiro/centro de trabalho)
            // é responsabilidade do use case, não da entidade.
            expect(changes.start_date).toBeInstanceOf(Date);
            expect(Object.keys(changes).sort()).toEqual(['start_date', 'status']);
          } else if (to === 'completed') {
            expect(changes.quantity_produced).toBe(7);
            expect(changes.quantity_scrapped).toBe(0);
            expect(changes.scrap_reason).toBeNull();
            expect(changes.completion_date).toBeInstanceOf(Date);
            expect(Object.keys(changes).sort()).toEqual(
              ['completion_date', 'quantity_produced', 'quantity_scrapped', 'scrap_reason', 'status'].sort(),
            );
          } else {
            // released, paused e canceled como ALVO (a partir de qualquer
            // origem válida): a entidade devolve APENAS { status }. Nenhum
            // rastro de "quando" ou "por quem" nasce aqui — quem grava isso
            // (se gravar) é o use case ou a camada de persistência.
            expect(Object.keys(changes)).toEqual(['status']);
          }
        });
      } else {
        it(`${from} -> ${to}: RECUSA com "Transicao invalida: ${from} -> ${to}"`, () => {
          const error = captureTransitionError(makeOrder(from), to);
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toBe(`Transicao invalida: ${from} -> ${to}`);
          expect(error.statusCode).toBe(422);
        });
      }
    }
  }

  describe('Resumo estrutural do grafo (redundante de propósito — trava o total, não só cada célula)', () => {
    it('tem exatamente 9 transições válidas em 36 combinações possíveis', () => {
      const validCount = ALL_STATUSES.flatMap((from) =>
        ALL_STATUSES.filter((to) => from !== to && EXPECTED_VALID_TRANSITIONS[from].includes(to)),
      ).length;
      expect(validCount).toBe(9);
    });

    it('completed e canceled são os dois únicos status TERMINAIS (zero saídas, inclusive para si mesmos)', () => {
      expect(EXPECTED_VALID_TRANSITIONS.completed).toEqual([]);
      expect(EXPECTED_VALID_TRANSITIONS.canceled).toEqual([]);

      for (const to of ALL_STATUSES) {
        const error = captureTransitionError(makeOrder('completed'), to);
        expect(error).toBeInstanceOf(BusinessRuleError);
      }
      for (const to of ALL_STATUSES) {
        const error = captureTransitionError(makeOrder('canceled'), to);
        expect(error).toBeInstanceOf(BusinessRuleError);
      }
    });

    it('paused -> in_progress é a única "reabertura" do grafo (nenhum outro status volta para um estado anterior de progresso)', () => {
      // Congela a observação do passo 26 (BR-PP-001): "paused -> in_progress
      // ... está só no código". Fora dela, o grafo é estritamente
      // unidirecional (planned -> released -> in_progress -> completed, com
      // canceled acessível de qualquer não-terminal).
      expect(EXPECTED_VALID_TRANSITIONS.paused).toContain('in_progress');
      const reopenings = ALL_STATUSES.filter((from) =>
        EXPECTED_VALID_TRANSITIONS[from].includes('in_progress'),
      );
      expect(reopenings.sort()).toEqual(['paused', 'released'].sort());
    });
  });
});
