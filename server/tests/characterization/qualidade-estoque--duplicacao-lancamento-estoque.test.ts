import { randomUUID } from 'crypto';
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { ensureFixtureCategoryId } from '../integration/helpers/categoryFixtures';

/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: `qualidade-estoque` · Alvo: **FIND-ERP-001, GRUPO B, item 2**
 * (`docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md`) —
 * `POST /api/inventory/movements` agora exige `operation_id` e rejeita
 * replay sequencial da mesma operação.
 *
 * ## Comportamento validado
 * Duas chamadas `POST /api/inventory/movements` **sequenciais** (uma após a
 * outra ter recebido `201` e commitado), com corpo idêntico e a mesma
 * `operation_id`, não duplicam o efeito: a primeira cria o
 * `InventoryMovement`, a segunda retorna `409` e o saldo fica aplicado uma
 * única vez.
 *
 * Âncoras:
 *  - `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
 *    (`create` — abre transação, chama o use case, `t.commit()`).
 *  - `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`
 *    (`execute` — propaga `operation_id` até o serviço).
 *  - `server/src/services/inventoryService.ts` (`adjust`/`createMovement`
 *    — persiste `operation_id`).
 *  - `server/src/models/InventoryMovement.ts` (índice único parcial sobre
 *    `operation_id`).
 *
 * ## Sobre a chave e o payload
 * `reference_id`/`reference_type` continuam aceitos pelo contrato legado,
 * mas o bloqueio de replay desta rota agora depende de `operation_id` único
 * por intenção de operação.
 *
 * ## Por que este teste é distinto de `stock-concurrency.test.ts` /
 * `product-movement-concurrency.test.ts`
 * Aquelas suítes disparam as duas chamadas **concorrentemente**
 * (`Promise.allSettled`) contra uma quantidade que deixa o produto sem
 * saldo suficiente para a segunda. Este teste usa `type: 'in'` e chamadas
 * **sequenciais**, isolando retry/duplo clique de uma operação que já teve
 * sucesso.
 *
 * Estilo: integração (API HTTP real + banco `erp_evok_audio_test`) — aguarda
 * execução central (`scripts/run-api-suite.cjs`), não executado por este
 * agente.
 *
 * @module tests/characterization/qualidade-estoque--duplicacao-lancamento-estoque
 */

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Caracterização — POST /api/inventory/movements: duplo lançamento sequencial não é rejeitado (FIND-ERP-001 grupo B)', () => {
  it('duas chamadas idênticas e sequenciais criam DOIS InventoryMovement distintos e dobram o saldo do produto', async () => {
    const token = authToken();
    const categoryId = await ensureFixtureCategoryId(token);

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Produto Duplicacao Lancamento ${Date.now()}`,
        code: `DUPL-MOV-${Date.now()}`,
        category_id: categoryId,
        unit: 'UN',
        quantity: 0,
        min_quantity: 1,
        cost_price: 1,
        price: 2,
      });
    expect(product.status).toBe(201);
    const productId = product.body.data.id;

    // Corpo IDÊNTICO nas duas chamadas — inclusive reference_id/reference_type,
    // reproduzindo literalmente o cenário de "duplo clique"/"retry de rede"
    // descrito em FIND-ERP-001 (REPRODUCTION, item 1).
    const payload = {
      product_id: productId,
      operation_id: randomUUID(),
      type: 'in',
      quantity: 10,
      description: 'Recebimento manual - teste de caracterizacao (duplo clique)',
      reference_id: 555,
      reference_type: 'adjustment',
    };

    // Sequencial de propósito (ver header): a segunda só é disparada depois
    // que a primeira já recebeu 201 e a transação já commitou no servidor —
    // não é uma corrida de concorrência, é um reenvio puro e simples.
    const first = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload);
    const second = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload);

    // Corrigido (FIND-ERP-001, GRUPO B, APR-2026-020): a primeira chamada
    // aplica a operação; o reenvio sequencial com a MESMA operation_id é
    // rejeitado pelo índice único parcial — não cria segundo registro.
    expect(first.status).toBe(201);
    expect(first.body.data.id).toBeDefined();
    expect(first.body.data.operation_id).toBe(payload.operation_id);

    expect(second.status).toBe(409);

    // Agravante (P1-04, FORA DE ESCOPO desta remediação — seção 6.1 do
    // TRIAGE.md): reference_id/reference_type do payload continuam
    // descartados pelo caminho de escrita. Esta asserção permanece
    // CONGELADA — não mexer.
    expect(first.body.data.reference_type).toBe('adjustment');
    expect(first.body.data.reference_id).toBeNull();

    // Congela a correção: produto nasceu com quantity=0, uma entrada de 10
    // foi aplicada uma única vez = 10 (não 20).
    const finalProduct = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(Number(finalProduct.body.data.quantity)).toBe(10);

    // Confirma pela listagem (não só pelo saldo agregado) que existem
    // exatamente 1 movimentação persistida para este produto.
    const movements = await api()
      .get('/api/inventory/movements')
      .query({ product_id: productId, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(movements.status).toBe(200);
    expect(movements.body.pagination.total).toBe(1);
  });
});
