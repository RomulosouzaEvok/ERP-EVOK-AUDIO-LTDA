import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { ensureFixtureCategoryId } from '../integration/helpers/categoryFixtures';

/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: `qualidade-estoque` · Alvo: **FIND-ERP-001, GRUPO B, item 2**
 * (`docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md`) —
 * `POST /api/inventory/movements` sem nenhuma proteção de idempotência.
 *
 * ## Comportamento congelado
 * Duas chamadas `POST /api/inventory/movements` **sequenciais** (uma após a
 * outra ter recebido `201` e commitado), com corpo idêntico, **não são
 * rejeitadas**: cada uma cria um `InventoryMovement` novo e distinto, e o
 * efeito de estoque é aplicado **duas vezes**. Não há:
 *  - lock sobre um recurso de "operação já processada";
 *  - verificação de estado terminal;
 *  - constraint `UNIQUE` sobre `(reference_type, reference_id)` — o índice
 *    existente (`InventoryMovement.ts:65`, `{ fields: ['reference_type',
 *    'reference_id'] }`) é de CONSULTA, não é `unique: true`.
 *
 * Âncoras:
 *  - `server/src/modules/inventory/presentation/controllers/inventoryController.ts:113-152`
 *    (`create` — abre transação, chama o use case, `t.commit()`, sem
 *    checagem prévia de duplicidade).
 *  - `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts:71-123`
 *    (`execute` inteiro — nenhuma checagem de idempotência).
 *  - `server/src/services/inventoryService.ts:327-381` (`adjust` — sempre
 *    incrementa/decrementa e sempre chama `createMovement`) e `:162-190`
 *    (`createMovement` — `InventoryMovement.create` puro, sem `findOrCreate`
 *    nem checagem prévia).
 *  - `server/src/models/InventoryMovement.ts:57-69` (índices — o único
 *    candidato a dedupe não é `unique: true`).
 *
 * ## Divergência adicional observada nesta sessão (evidência > documento)
 * `FIND-ERP-001` cita `reference_id`/`reference_type` do corpo da requisição
 * como parte do cenário de reprodução (`{ ..., reference_id: 123,
 * reference_type: 'adjustment' }`), mas a leitura do código mostra que esse
 * caminho de escrita **descarta silenciosamente os dois campos**:
 * `CreateInventoryMovementUseCase.ts:107-116` chama
 * `InventoryService.adjust(input.product_id, input.type, input.quantity,
 * userId, input.description, transaction, warehouse.id, item_id)` — sem
 * repassar `input.reference_id`/`input.reference_type` — e `adjust()`
 * (`inventoryService.ts:356-368`) grava sempre `referenceType: 'adjustment'`
 * hardcoded e nunca define `referenceId` (`createMovement` recebe
 * `data.referenceId` `undefined` ⇒ persiste `null`). Ou seja: TODA
 * movimentação manual criada por esta rota nasce com
 * `reference_type='adjustment'` e `reference_id=null`, **mesmo que o
 * cliente informe outro valor no payload** — o `reference_id` do payload é
 * aceito pelo schema (`inventoryValidators.ts`), validado pela entidade
 * (`InventoryMovementEntity.toServiceInput()`), e depois simplesmente não
 * chega à escrita. Este teste caracteriza esse comportamento junto ao
 * achado principal, sem promover finding novo (Regra 22 — achado
 * candidato, não confirmado por este agente; reportar ao orquestrador).
 *
 * ## Por que este teste é distinto de `stock-concurrency.test.ts` /
 * `product-movement-concurrency.test.ts`
 * Aquelas suítes disparam as duas chamadas **concorrentemente**
 * (`Promise.allSettled`) contra uma quantidade que deixa o produto SEM
 * saldo suficiente para a segunda — o que é rejeitado ali é efeito do lock
 * pessimista + guarda de saldo insuficiente (`validateAndLock`), não de
 * nenhuma proteção de idempotência. Este teste usa `type: 'in'` (entrada,
 * nunca rejeitada por saldo) e chamadas **sequenciais** (a segunda só é
 * disparada depois que a primeira já commitou), isolando exatamente o
 * cenário do FIND-ERP-001: retry/duplo-clique de uma operação que JÁ teve
 * sucesso.
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
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

    // Congela o achado central: NENHUMA das duas chamadas é rejeitada.
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    // Congela: são DOIS registros distintos, não uma reexecução idempotente
    // deduplicada em um único InventoryMovement.
    expect(first.body.data.id).toBeDefined();
    expect(second.body.data.id).toBeDefined();
    expect(second.body.data.id).not.toBe(first.body.data.id);

    // Congela a divergência adicional: reference_id/reference_type do
    // payload são descartados pelo caminho de escrita (ver header) —
    // ambos os registros gravam 'adjustment'/null, não o que foi enviado.
    expect(first.body.data.reference_type).toBe('adjustment');
    expect(first.body.data.reference_id).toBeNull();
    expect(second.body.data.reference_type).toBe('adjustment');
    expect(second.body.data.reference_id).toBeNull();

    // Congela o efeito de estoque DOBRADO: produto nasceu com quantity=0,
    // duas entradas de 10 aplicadas integralmente = 20 (não 10).
    const finalProduct = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(Number(finalProduct.body.data.quantity)).toBe(20);

    // Confirma pela listagem (não só pelo saldo agregado) que existem
    // exatamente 2 movimentações persistidas para este produto — descarta a
    // hipótese de que o segundo 201 fosse uma resposta "fantasma" sem
    // persistência real.
    const movements = await api()
      .get('/api/inventory/movements')
      .query({ product_id: productId, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(movements.status).toBe(200);
    expect(movements.body.pagination.total).toBe(2);
  });
});
